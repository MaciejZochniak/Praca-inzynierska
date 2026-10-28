package pl.zochniak.ogrodbackend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "is_available", nullable = false)
    @Builder.Default
    private Boolean isAvailable = true;

    @Column (name = "image_url", length = 200)
    private String imageUrl;

    @CreationTimestamp 
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany (mappedBy = "item", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Price> prices = new ArrayList<>();
}
