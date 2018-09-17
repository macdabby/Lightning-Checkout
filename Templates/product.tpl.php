<div class="row">
    <div class="column">
        <h1><?= $product->title; ?></h1>
        <div class="medium-6 column options-image">
        </div>
        <div class="medium-6 column options-fields">
            <?= $product->renderCheckoutOptions(); ?>
        </div>
        <div class="column">
            <p><?= $product->description; ?></p>
        </div>
    </div>
</div>
<?php if (!empty($gallery)){
    $this->build(['gallery', 'PhotoGallery']);
} ?>
