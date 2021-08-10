package com.example.fhirexample;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;

import com.example.fhirexample.FhirTesterConfig;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.DispatcherServlet;

@SuppressWarnings("ALL")
@SpringBootApplication
public class FhirExampleApplication {
    @Autowired
    AutowireCapableBeanFactory beanFactory;

    public static void main(String[] args) {
        SpringApplication.run(FhirExampleApplication.class, args);
    }

    @Bean
    public ServletRegistrationBean hapiServletRegistration() {
        ServletRegistrationBean servletRegistrationBean = new ServletRegistrationBean();
        SimpleRestfulServer restfulServer = new SimpleRestfulServer();
        beanFactory.autowireBean(restfulServer);
        servletRegistrationBean.setServlet(restfulServer);
        servletRegistrationBean.addUrlMappings("/fhir/*");
        servletRegistrationBean.setLoadOnStartup(1);
    
        return servletRegistrationBean;
    }

    @Bean
    public ServletRegistrationBean overlayRegistrationBean() {

        AnnotationConfigWebApplicationContext annotationConfigWebApplicationContext = new AnnotationConfigWebApplicationContext();
        annotationConfigWebApplicationContext.register(FhirTesterConfig.class);

        DispatcherServlet dispatcherServlet = new DispatcherServlet(
        annotationConfigWebApplicationContext);
        dispatcherServlet.setContextClass(AnnotationConfigWebApplicationContext.class);
        dispatcherServlet.setContextConfigLocation(FhirTesterConfig.class.getName());

        ServletRegistrationBean registrationBean = new ServletRegistrationBean();
        registrationBean.setServlet(dispatcherServlet);
        registrationBean.addUrlMappings("/*");
        registrationBean.setLoadOnStartup(1);
        return registrationBean;
  }

}
