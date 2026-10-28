package pl.zochniak.ogrodbackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

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
    private Item item;

    @Column(name = "total_rental_hours", precision = 10, scale = 2)
    private BigDecimal totalRentalHours;

    @Column(name = "utilization_rate", precision = 5, scale = 2)
    private BigDecimal utilizationRate;

    @Column(name = "period_month", length = 7)
    private String periodMonth;

    @Column(name = "forecasted_demand")
    private Integer forecastedDemand;
}