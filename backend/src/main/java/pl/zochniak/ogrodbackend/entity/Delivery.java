package pl.zochniak.ogrodbackend.entity;
import pl.zochniak.ogrodbackend.entity.enums.DeliveryType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Delivery {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false, unique = true)
    private Reservations reservation;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_type", nullable = false, length = 30)
    private DeliveryType deliveryType;

    @Column(length = 200)
    private String street;

    @Column(length = 200)
    private String city;

    @Column(name = "postal_code", length = 10)
    private String postalCode;

    @Column(name = "delivery_cost", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal deliveryCost = BigDecimal.ZERO;

    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;
}