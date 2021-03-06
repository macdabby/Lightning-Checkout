<?php

namespace lightningsdk\checkout\Database\Schema;

use lightningsdk\core\Database\Schema;

class Category extends Schema {

    const TABLE = 'checkout_catgeory';

    public function getColumns() {
        return [
            'category_id' => $this->int(true),
            'parent_id' => $this->int(true),
            'name' => $this->varchar(32),
            'url' => $this->varchar(32),
            'header_text' => $this->text(),
            'description' => $this->text(),
        ];
    }

    public function getKeys() {
        return [
            'primary' => 'category_id',
        ];
    }
}
