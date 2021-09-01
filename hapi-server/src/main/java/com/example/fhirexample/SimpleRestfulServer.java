package com.example.fhirexample;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;
import ca.uhn.fhir.rest.server.RestfulServer;
import ca.uhn.fhir.rest.server.interceptor.ResponseHighlighterInterceptor;
import ca.uhn.fhir.validation.FhirValidator;
import ca.uhn.fhir.validation.IValidatorModule;
import com.example.fhirexample.ResourceProvider.*;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;

import org.hl7.fhir.common.hapi.validation.validator.FhirInstanceValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.stereotype.Service;

public class SimpleRestfulServer extends RestfulServer{
    private static final Logger logger = LoggerFactory.getLogger("com.example.fhirexample.SimpleRestfulServer");
    private static DatabaseClient client = null;
    // TODO Read these from properties file
    private static final String host = "localhost";
    private static final int port = 8011;
    private static final String userName = "data-services-example-user";
    private static final String password = "password";
    // TODO Need to debug why this does not work
    @Value("${mlHost}")
    private String mlHost;
    //Initialize
    @Override
    protected void initialize()throws ServletException {
        try {
            client = setupMarkLogicClient();
            System.out.println("ML Client [" + client.checkConnection() + "]");
            System.out.println("ML Client [" + client.getDatabase() + "]");
            System.out.println("ML HOST [" + mlHost + "]");
            //create a context for the appropriate version
            FhirContext ctx = FhirContext.forR5();
            setFhirContext(ctx);
            IParser parser = ctx.newJsonParser();
            // Ask the context for a validator
            FhirValidator validator = ctx.newValidator();
            // Create a validation module and register it
            IValidatorModule module = new FhirInstanceValidator(ctx);
            validator.registerValidatorModule(module);
            //Register Resource Providers
            registerProvider(new PatientResourceProvider(client, parser));
            registerProvider(new PractitionerResourceProvider(client, parser));
            registerProvider(new LocationResourceProvider(client, parser));
            registerProvider(new PractitionerRoleResourceProvider(client, parser));
            /*
             * Use nice coloured HTML when a browser is used to request the content
             */
            registerInterceptor(new ResponseHighlighterInterceptor());
        } catch (Exception ex) {
            System.out.println("Initialization failed [" + ex.getMessage() + "]");
        }
    }
    @Override
    public void destroy() {
        try {
            // Additional clean up activities
            // Release MarkLogic client
            System.out.println("Releasing ML client");
            if (client != null) client.release();
        } catch (Exception ex) {
            System.out.println("Exception Releasing ML client [" + ex.getMessage() + "]");
        }
    }

    private DatabaseClient setupMarkLogicClient() {
        try {
            client = DatabaseClientFactory.newClient(host, port,
                    new DatabaseClientFactory.DigestAuthContext(userName, password));
                    //DatabaseClient.ConnectionType.GATEWAY);
        } catch (Exception ex) {
             logger.info(ex.getMessage());
             ex.printStackTrace();
        }
        return client;
    }
}

