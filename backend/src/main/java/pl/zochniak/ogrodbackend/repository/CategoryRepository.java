package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    
}