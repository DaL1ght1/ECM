package com.bfi.ecm.Tools;

import java.nio.charset.Charset;
import java.util.Collection;
import java.util.Random;

public abstract class BfiTools {
    public static boolean isEmpty(Object object) {
        if (object instanceof String) {
            isEmpty((String)object);
        }
        if (object instanceof Collection) {
            isEmpty((Collection)object);
        }
        return object == null;
    }

    public static boolean isEmpty(String str) {
        return str == null || str.isEmpty();
    }

    public static boolean isEmpty(Collection collection) {
        return collection == null || collection.isEmpty();
    }

    public static String getAlphaNumericString(int n)
    {
        byte[] array = new byte[256];
        new Random().nextBytes(array);
        String randomString = new String(array, Charset.forName("UTF-8"));
        StringBuffer r = new StringBuffer();
        for (int k = 0; k < randomString.length(); k++) {
            char ch = randomString.charAt(k);
            if (((ch >= 'a' && ch <= 'z')
                    || (ch >= 'A' && ch <= 'Z')
                    || (ch >= '0' && ch <= '9'))
                    && (n > 0)) {
                r.append(ch);
                n--;
            }
        }
        return r.toString();
    }

}
