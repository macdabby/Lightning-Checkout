<?php if (!empty($breadcrumbs)): ?>
    <div class="row">
        <div class="column">
            <ul class="breadcrumbs">
                <li><a href="/store">Store</a></li>
                <?php foreach ($breadcrumbs as $url => $name): ?>
                    <?php if ($url == '#current'): ?>
                        <li class="current"><?=$name;?></li>
                    <?php else: ?>
                        <li><a href="<?=$url;?>"><?=$name;?></a></li>
                    <?php endif; ?>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>
<?php endif; ?>
