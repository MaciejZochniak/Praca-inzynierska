package pl.zochniak.ogrodbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import pl.zochniak.ogrodbackend.entity.enums.ProtocolType;

import java.time.LocalDateTime;

@Entity
@Table(name = "handover_protocols")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Handover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservations reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "protocol_type", nullable = false, length = 20)
    private ProtocolType protocolType;

    @Column(name = "fuel_level", length = 30)
    private String fuelLevel;

    @Column(name = "technical_condition_notes", columnDefinition = "TEXT")
    private String technicalConditionNotes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}