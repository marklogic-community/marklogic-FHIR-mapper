package com.marklogic.util;

import java.lang.Integer;

public class Pagination {
    Integer offset;
    Integer count;

    public Pagination(Integer offset, Integer count) {
        this.offset = (offset != null) ? offset : 1;
        this.count = (count != null) ? count : 20;
        System.out.println("Offset [" + this.offset + "]");
        System.out.println("Count [" + this.count + "]");
    }

    public Integer getOffset() {
        return this.offset;
    }

    public void setOffset(Integer offset) {
        this.offset = offset;
    }

    public Integer getCount() {
        return this.count;
    }

    public void setCount(Integer count) {
        this.count = count;
    }
}
