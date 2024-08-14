package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Enums.EmailTemplateName;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;


    @Async
    public void sendEmail(String to,
                          String username,
                          EmailTemplateName emailTemp,
                          String confirmationUrl,
                          String activationCode,
                          String subject) throws MessagingException {
        String templateName;
        if (emailTemp == null) {
            templateName = "confirm-email";
        } else {
            templateName = emailTemp.getName();
        }
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(mimeMessage, MimeMessageHelper.MULTIPART_MODE_MIXED, StandardCharsets.UTF_8.name());
        Map<String, Object> model = new HashMap<>();
        model.put("username", username);
        model.put("confirmationUrl", confirmationUrl);
        model.put("activationCode", activationCode);
        Context context = new Context();
        context.setVariables(model);
        mimeMessageHelper.setFrom("contact@help.com");
        mimeMessageHelper.setTo(to);
        mimeMessageHelper.setSubject(subject);
        String temp = templateEngine.process(templateName, context);
        mimeMessageHelper.setText(temp, true);
        mailSender.send(mimeMessage);
    }

    @Async
    public void sendEmailAdmin(String to,
                               String username,
                               String Email,
                               String CreatedAt,
                               EmailTemplateName emailTemp,
                               String confirmationUrl,
                               String activationCode,
                               String subject) throws MessagingException {
        String templateName;
        if (emailTemp == null) {
            templateName = "confirm-email";
        } else {
            templateName = emailTemp.getName();
        }
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(mimeMessage, MimeMessageHelper.MULTIPART_MODE_MIXED, StandardCharsets.UTF_8.name());
        Map<String, Object> model = new HashMap<>();
        model.put("username", username);
        model.put("Email", Email);
        model.put("CreatedAt", CreatedAt);
        model.put("confirmationUrl", confirmationUrl);
        model.put("activationCode", activationCode);
        Context context = new Context();
        context.setVariables(model);
        mimeMessageHelper.setFrom("contact@help.com");
        mimeMessageHelper.setTo(to);
        mimeMessageHelper.setSubject(subject);
        String temp = templateEngine.process(templateName, context);
        mimeMessageHelper.setText(temp, true);
        mailSender.send(mimeMessage);
    }
}
