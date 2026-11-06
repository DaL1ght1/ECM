package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.Tokens;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TokensRepository extends JpaRepository<Tokens, Long> {

    List<Tokens> findByText(String text);

    @Query("SELECT t FROM Tokens t WHERE LOWER(t.text) = LOWER(:text)")
    List<Tokens> findByTextContainingIgnoreCase(@Param("text") String text);

    @Query("SELECT t FROM Tokens t WHERE LOWER(t.NoVowel) = LOWER(:newToken)")
    List<Tokens> findByNewTokenContainingIgnoreCase(@Param("newToken") String newToken);

    @Query("SELECT t FROM Tokens t WHERE t.soundexCode = :soundexCode")
    List<Tokens> findBySoundexCode(@Param("soundexCode") String soundexCode);

    @Modifying
    @Query("DELETE FROM Tokens t WHERE t NOT IN (SELECT f.tokens FROM File f)")
    void deleteOrphanTokens();
}
