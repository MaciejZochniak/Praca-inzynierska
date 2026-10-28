package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Reviews;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReviewsRepository extends JpaRepository<Reviews, Long> {
    List<Reviews> findByItemId(Long itemId);
    Optional<Reviews> findByReservationId(Long reservationId);
    boolean existsByReservationId(Long reservationId);
}