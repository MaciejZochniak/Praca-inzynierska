package pl.zochniak.ogrodbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pl.zochniak.ogrodbackend.entity.Category;
import pl.zochniak.ogrodbackend.entity.Item;
import pl.zochniak.ogrodbackend.entity.Reservations;
import pl.zochniak.ogrodbackend.repository.CategoryRepository;
import pl.zochniak.ogrodbackend.repository.ItemRepository;
import pl.zochniak.ogrodbackend.repository.ReservationsRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ItemController {

    private final ItemRepository itemRepository;
    private final CategoryRepository categoryRepository;
    private final ReservationsRepository reservationsRepository;

    @GetMapping
    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    @GetMapping("/categories")
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Item> getItemById(@PathVariable Long id) {
        return itemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private Category resolveOrCreateCategory(Map<String, Object> body, boolean isService) {
        Object newCatObj = body.get("newCategoryName");
        if (newCatObj != null && !newCatObj.toString().trim().isEmpty()) {
            String newCatName = newCatObj.toString().trim();
            Category newCategory = Category.builder()
                    .name(newCatName)
                    .description(isService ? "Kategoria usług ogrodniczych" : "Kategoria sprzętu ogrodniczego")
                    .build();
            return categoryRepository.save(newCategory);
        }

        if (body.get("categoryId") != null) {
            Long categoryId = Long.valueOf(body.get("categoryId").toString());
            return categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono wybranej kategorii."));
        }
        throw new IllegalArgumentException("Wybierz kategorię lub wpisz nazwę nowej kategorii.");
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Item> createItem(@RequestBody Map<String, Object> body) {
        String itemType = body.get("itemType") != null ? body.get("itemType").toString() : "EQUIPMENT";
        boolean isService = "SERVICE".equalsIgnoreCase(itemType);

        Category category = resolveOrCreateCategory(body, isService);
        if (!isService && category.getId() != null && category.getId() >= 10 && body.get("newCategoryName") == null) {
            isService = true;
        }

        String name = body.get("name").toString().trim();
        if (isService && !name.toLowerCase().startsWith("usługa:")) {
            name = "Usługa: " + name;
        }

        String brand = body.get("brand") != null && !body.get("brand").toString().isBlank()
                ? body.get("brand").toString().trim()
                : null;
        String description = body.get("description") != null ? body.get("description").toString().trim() : "";
        BigDecimal price = new BigDecimal(body.get("price").toString());
        Integer quantity = body.get("quantity") != null ? Integer.valueOf(body.get("quantity").toString()) : 1;
        String imageUrl = body.get("imageUrl") != null && !body.get("imageUrl").toString().isBlank()
                ? body.get("imageUrl").toString().trim()
                : "/images/kosiarka.jpg";

        Item item = Item.builder()
                .category(category)
                .name(name)
                .brand(brand)
                .description(description)
                .price(price)
                .quantity(quantity)
                .isAvailable(true)
                .imageUrl(imageUrl)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(itemRepository.save(item));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Item> updateItem(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono oferty o ID: " + id));

        String itemType = body.get("itemType") != null ? body.get("itemType").toString() : "";
        boolean isService = "SERVICE".equalsIgnoreCase(itemType)
                || (item.getName() != null && item.getName().toLowerCase().startsWith("usługa:"));

        if (body.get("newCategoryName") != null || body.get("categoryId") != null) {
            Category category = resolveOrCreateCategory(body, isService);
            item.setCategory(category);
        }

        if (body.get("name") != null) {
            String name = body.get("name").toString().trim();
            if (isService && !name.toLowerCase().startsWith("usługa:")) {
                name = "Usługa: " + name;
            }
            item.setName(name);
        }

        item.setBrand(body.get("brand") != null && !body.get("brand").toString().isBlank()
                ? body.get("brand").toString().trim()
                : null);

        if (body.get("description") != null) {
            item.setDescription(body.get("description").toString().trim());
        }
        if (body.get("price") != null) {
            item.setPrice(new BigDecimal(body.get("price").toString()));
        }
        if (body.get("quantity") != null) {
            item.setQuantity(Integer.valueOf(body.get("quantity").toString()));
        }
        if (body.get("imageUrl") != null && !body.get("imageUrl").toString().isBlank()) {
            item.setImageUrl(body.get("imageUrl").toString().trim());
        }

        return ResponseEntity.ok(itemRepository.save(item));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        List<Reservations> related = reservationsRepository.findByItemId_Id(id);
        if (!related.isEmpty()) {
            reservationsRepository.deleteAll(related);
        }
        itemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}