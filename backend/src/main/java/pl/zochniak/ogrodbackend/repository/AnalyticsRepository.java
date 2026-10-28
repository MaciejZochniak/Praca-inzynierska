package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Analytics;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnalyticsRepository extends JpaRepository<Analytics, Long> {
    List<Analytics> findByItemId(Long itemId);
    List<Analytics> findByPeriodMonth(String periodMonth);
}