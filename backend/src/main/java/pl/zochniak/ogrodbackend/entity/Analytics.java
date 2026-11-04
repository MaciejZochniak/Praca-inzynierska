package pl.zochniak.ogrodbackend.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;
@Entity
@Table(name = "equipment_analytics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Analytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item itemId;

    @Column(name = "total_rental_hours", precision = 10, scale = 2)
    private BigDecimal totalRentalHours;

    @Column(name = "utilization_rate", precision = 5, scale = 2)
    private BigDecimal utilizationRate;

    @Column(name = "month", length = 7)
    private String month;

    @Column(name = "forecasted_demand")
    private Integer forecastedDemand;
}