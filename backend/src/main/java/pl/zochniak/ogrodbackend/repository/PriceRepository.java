package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Price;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PriceRepository extends JpaRepository<Price, Long> {
    List<Price> findByItemId(Long itemId);
}