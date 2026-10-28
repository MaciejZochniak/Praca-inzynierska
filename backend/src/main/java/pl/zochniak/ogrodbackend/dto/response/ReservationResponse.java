package pl.zochniak.ogrodbackend.dto.response;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;
import lombok.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationResponse {
    private Long reservationId;

    //status rezerwacji początkowo 
    private ReservationStatus status;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    //wyliczony łączny koszt rezerwacji
    private BigDecimal totalPrice;

    //informacja dla klienta
    private String message;
}