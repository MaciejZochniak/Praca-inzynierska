package pl.zochniak.ogrodbackend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;
import pl.zochniak.ogrodbackend.entity.enums.Role;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(name = "first_name", length = 50, nullable = false)
    private String firstName;

    @Column (name = "last_name", length = 50, nullable = false)
    private String lastName;

    @Column (name = "phone_number", length = 20, nullable = false)
    private String phoneNumber;

    @Enumerated (EnumType.STRING)
    @Column(nullable = false, length = 20)
    private String role;

    @CreationTimestamp 
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}