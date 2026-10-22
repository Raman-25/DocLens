package com.doclens.doclens_backend.exceptions;

public class ResourceNotFoundException extends RuntimeException{

    public  ResourceNotFoundException(){
        super("Resource you are looking for not found! ");

    }
    public  ResourceNotFoundException(String message){
      super(message);
    }
    public  ResourceNotFoundException(String m, Throwable ex){
     super(m,ex);
    }

}
