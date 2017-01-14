<?php

namespace Modules\Checkout\Model;

use Lightning\Model\Object;
use Lightning\Tools\Database;

class Discount extends Object {
    const TABLE = 'checkout_discount';
    const PRIMARY_KEY = 'discount_id';

    protected $__json_encoded_fields = ['discounts'];

    public static function loadByCode($code) {
        if ($discount = Database::getInstance()->selectRow(static::TABLE, ['code' => ['LIKE', $code]])) {
            return new static($discount);
        } else {
            return null;
        }
    }

    /**
     * @param Order $order
     *
     * @return float
     */
    public function getAmount($order) {
        $discount = 0;
        if (!empty($this->discounts->percent)) {
            $discount = $this->discounts->percent * $order->getSubTotal() / 100;
        }

        return number_format(-$discount, 2);
    }
}