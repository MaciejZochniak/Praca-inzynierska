package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.User;
import pl.zochniak.ogrodbackend.entity.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(Role role);
}