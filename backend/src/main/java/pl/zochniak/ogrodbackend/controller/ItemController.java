package pl.zochniak.ogrodbackend.controller;
import pl.zochniak.ogrodbackend.entity.Item;
import pl.zochniak.ogrodbackend.repository.ItemRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173"})
public class ItemController {
    private final ItemRepository itemRepository;
    @GetMapping
    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }
    @GetMapping("/{id}")
    public ResponseEntity<Item> getItemById(@PathVariable Long id) {
        return itemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}