package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    Optional<Delivery> findByReservationId(Long reservationId);
}