package com.smartpricing.business.repository;

import com.smartpricing.business.entity.BusinessSettings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;

public interface BusinessSettingsRepository extends JpaRepository<BusinessSettings, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from BusinessSettings b where b.id = 1")
    BusinessSettings lockSingleton();
}
