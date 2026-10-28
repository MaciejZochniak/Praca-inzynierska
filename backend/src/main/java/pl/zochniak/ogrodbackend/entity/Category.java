package pl.zochniak.ogrodbackend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp 
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @OneToMany (mappedBy = "category", cascade = CascadeType.ALL)
    @Builder .Default
    private List<Item> items = new ArrayList<>();
}