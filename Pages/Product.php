<?php

namespace Modules\Checkout\Pages;

use Exception;
use Lightning\Pages\Page;
use Lightning\Tools\Output;
use Lightning\Tools\Request;
use Lightning\Tools\Template;
use Lightning\View\CSS;
use Lightning\View\JS;
use Modules\Checkout\Model\Category;
use Modules\Checkout\Model\Product as ProductModel;
use Modules\Checkout\View\Checkout;

class Product extends Page {

    protected $page = ['product_wrapper', 'Checkout'];

    public function get() {
        CSS::add('/css/modules.css');
        $content_locator = Request::getFromURL('/store\/(.*)/');

        if (empty($content_locator)) {
            Output::notFound();
        }

        $template = Template::getInstance();
        if ($product = ProductModel::loadByURL($content_locator)) {
            // If this is a product page.
            $template->set('product', $product);

            if (!empty($product->options['options_popup_template'])) {
                $template->set('fields_template', $product->options['options_popup_template']);
            }

            if (!empty($product->options['product_template'])) {
                $template->set('product_template', $product->options['product_template']);
            } else {
                $template->set('product_template', ['product', 'Checkout']);
            }

            // Init the checkout methods
            JS::startup('lightning.modules.checkout.init();', ['Checkout' => 'Checkout.js']);
            JS::startup('lightning.modules.checkout.initProductOptions(' . json_encode(['options' => $product->options, 'base_price' => $product->price]) . ');', ['Checkout' => 'Checkout.js']);

            Checkout::init();

            // Set up the meta data.
            $this->setMeta('title', $product->title);
            $this->setMeta('description', $product->description);
            $this->setMeta('image', $product->getImage('og-image'));
        } elseif ($category = Category::loadByURL($content_locator)) {
            // If this is a category page.
            $template->set('category', $category);
            // TODO: Add pagination
            $this->page[0] = 'category';
            $products = ProductModel::loadAll(['category_id' => $category->id]);
            $template->set('products', $products);

            // Add meta data
            $this->setMeta('title', !empty($category->header_text) ? $category->header_text : $category->name);
            $this->setMeta('description', $category->description);
            foreach ($products as $product) {
                if ($image = $product->getImage('og-image')) {
                    $this->setMeta('image', $image);
                    break;
                }
            }
        } else {
            Output::notFound();
        }
    }
}
