package pl.zochniak.ogrodbackend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "reservation_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservations_items {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservations reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
}