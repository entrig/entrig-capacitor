package com.entrig.plugin.capacitor;

import com.getcapacitor.Logger;

public class Entrig {

    public String echo(String value) {
        Logger.info("Echo", value);
        return value;
    }
}
