package com.smartpricing.shopify;

import javax.crypto.*;
import javax.crypto.spec.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class TokenCipher {
    private final ShopifySettings settings;public TokenCipher(ShopifySettings settings){this.settings=settings;}
    public void validateKey(){key();}
    private SecretKeySpec key(){try{byte[] key=Base64.getDecoder().decode(settings.encryptionKey());if(key.length!=32)throw new IllegalArgumentException();return new SecretKeySpec(key,"AES");}catch(RuntimeException exception){throw new IllegalStateException("A valid separately configured 256-bit credential encryption key is required.");}}
    public String seal(String token,String purpose){
        try{if(token==null||token.isBlank()||token.length()>8192)throw new IllegalArgumentException();byte[] iv=new byte[12];new SecureRandom().nextBytes(iv);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key(),new GCMParameterSpec(128,iv));cipher.updateAAD(purpose.getBytes(StandardCharsets.UTF_8));byte[] ciphertext=cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));byte[] result=new byte[iv.length+ciphertext.length];System.arraycopy(iv,0,result,0,12);System.arraycopy(ciphertext,0,result,12,ciphertext.length);return "v1:"+Base64.getEncoder().encodeToString(result);}catch(GeneralSecurityException|IllegalArgumentException exception){throw new IllegalStateException("Provider credential could not be encrypted.");}
    }
    public String open(String encoded,String purpose){
        try{if(encoded==null||!encoded.startsWith("v1:"))throw new IllegalArgumentException();byte[] bytes=Base64.getDecoder().decode(encoded.substring(3));if(bytes.length<29)throw new IllegalArgumentException();Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Arrays.copyOf(bytes,12)));cipher.updateAAD(purpose.getBytes(StandardCharsets.UTF_8));return new String(cipher.doFinal(Arrays.copyOfRange(bytes,12,bytes.length)),StandardCharsets.UTF_8);}catch(GeneralSecurityException|IllegalArgumentException exception){throw new IllegalStateException("Provider credential is unavailable.");}
    }
}
