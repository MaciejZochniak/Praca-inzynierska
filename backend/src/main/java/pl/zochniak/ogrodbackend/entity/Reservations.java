package pl.zochniak.ogrodbackend.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "reservations")
@Getter
@Setter
public class Reservations {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @Column (name = "guest_name", nullable = true, length = 100)
    private String guestName;

    @Column (name = "guest_email", nullable = true, length = 100)
    private String guestEmail;

    @Column (name = "guest_phone", nullable = true, length = 20)
    private String guestPhone;

    @ManyToOne
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @ManyToOne 
    @JoinColumn (name = "employee_id", nullable = true)
    private User employee;
}