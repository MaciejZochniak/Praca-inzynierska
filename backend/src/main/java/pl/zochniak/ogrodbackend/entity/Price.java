package pl.zochniak.ogrodbackend.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@Table(name = "prices")
@Getter
@Setter
public class Price {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal multiplier = new BigDecimal("1.00");

    @Column(name = "min_duration", nullable = false)
    private Integer minDuration;

}