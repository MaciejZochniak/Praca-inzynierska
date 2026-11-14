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

    @PostMapping
    @Transactional
    public ResponseEntity<Item> createItem(@RequestBody Map<String, Object> body) {
        Long categoryId = Long.valueOf(body.get("categoryId").toString());
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono wybranej kategorii."));

        String name = body.get("name").toString().trim();
        if (categoryId >= 10 && !name.toLowerCase().startsWith("usługa:")) {
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

        if (body.get("categoryId") != null) {
            Long categoryId = Long.valueOf(body.get("categoryId").toString());
            Category category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono wybranej kategorii."));
            item.setCategory(category);
        }

        if (body.get("name") != null) {
            String name = body.get("name").toString().trim();
            Long catId = item.getCategory() != null ? item.getCategory().getId() : 0L;
            if (catId >= 10 && !name.toLowerCase().startsWith("usługa:")) {
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