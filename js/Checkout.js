(function(){
    var self = lightning.modules.checkout = {
        contents: {},
        requestId: 0,
        lastRequestId: 0,
        cartIcon: null,
        init: function() {
            $('.checkout-product').click(self.click);
            var request_id = ++self.requestId;
            $.ajax({
                url : '/api/cart',
                dataType: 'json',
                success: function(data) {
                    lightning.modules.checkout.processUpdatedCart(data, request_id, true);
                }
            });

            // Make sure the modal is present prior to attaching event listeners.
            lightning.dialog.init();
            // Add an event handler when clicking to remove an item.
            $('.reveal-modal').on('click', '.remove img', self.removeItem)
                .on('change', '.checkout-qty', self.updateQty)
                .on('click', '.checkout-update-total', self.updateQtys)
                .on('click', '.checkout-pay', self.pay);
        },

        click: function(event) {
            var button = $(event.target);
            var product_id = button.data('checkout-product-id');
            var options = {};
            if (button.data('checkout') == 'add-to-cart') {
                self.addItem(product_id, 1, options);
            } else {
                // Pay Now
                if (button.data('create-customer')) {
                    options.create_customer = true;
                }
                if (button.data('redirect')) {
                    options.redirect = button.data('redirect');
                }
                if (button.data('title')) {
                    options.title = button.data('title');
                }
                if (button.data('amount')) {
                    options.amount = button.data('amount');
                }
                if (button.data('shipping-address') == "true") {
                    options.shipping_address = true;
                }
                if (button.data('modules.checkout.bitcoin', false)) {
                    options.bitcoin = true;
                }
                if (product_id) {
                    options.product_id = product_id;
                }
                var paymentHandler = lightning.get('modules.checkout.handler');
                var handler = lightning.getMethodReference(paymentHandler);
                handler(options, function(){
                    if (options.redirect) {
                        window.location = options.redirect;
                    }
                });
            }
        },

        addItemPopupOptions: function() {
            // Make sure to validate the form.
            var form = $('#checkout-popup-options');
            var elems = form.find('input, textarea, select').not(":hidden, [data-abide-ignore]").get();
            Foundation.libs.abide.validate(elems, form, true);
            if (form.find('div.error').length == 0) {
                var options = {};
                form.find('input,select,textarea').each(function(index, item){
                    options[item.name] = item.value;
                });
                self.addItem(form.data('product-id'), 1, options);
            }
        },

        addItem: function(product_id, qty, options) {
            var request_id = ++self.requestId;
            lightning.dialog.showLoader('Adding this item to your cart...');
            $.ajax({
                url: '/api/cart',
                method: 'POST',
                dataType: 'json',
                data: {
                    product_id: product_id,
                    qty: qty,
                    options: options,
                    action: 'add-to-cart',
                },
                success: function(data) {
                    if (data.form) {
                        lightning.dialog.showContent(data.form);
                        self.initProductOptions(data);
                        setTimeout(function(){
                            $(document).foundation('reflow');
                        }, 500);
                    } else {
                        lightning.tracker.track(lightning.tracker.events.addToCart, {
                            label: product_id
                        });
                        lightning.modules.checkout.processUpdatedCart(data, request_id);
                    }
                }
            });
        },

        initProductOptions: function(data) {
            self.popupOptions = data.options;
            self.basePrice = data.base_price;
            self.updateOptionsFormRoot();
            $('.options-fields').on('change', 'input,select', self.updateOptionsFormRoot);
        },

        updateOptionsFormRoot: function() {
            self.popupImg = self.popupOptions.image ? self.popupOptions.image : null;
            self.updateOptionsForm(null, self.popupOptions, $('.options-fields'));
            if (self.popupImg) {
                var img = $('.options-image').find('img');
                if (img.length == 0) {
                    $('.options-image').append('<img src="' + self.popupImg + '">');
                } else {
                    img.prop('src', self.popupImg);
                }
            } else {
                $('.options-image').empty();
            }
            $('.price', $('.options-fields')).html('$' + parseFloat(self.basePrice).toFixed(2));
        },

        // Build form options
        updateOptionsForm: function(field, options, parent) {
            var field_container;
            for (var i in options.options) {
                field_container = parent.children().filter('.children');

                // Remove any fields that are at the current level and not in the current options list.
                field_container.children().each(function(){
                    var obj = $(this);
                    if (!options.options.hasOwnProperty(obj.children().first().prop('name'))) {
                        obj.remove();
                    }
                });

                // If the current field is not present, add it.
                var field_name = i.replace(/[^a-z0-9-_]/i, '');
                if (parent.find('#option-' + field_name).length == 0) {
                    var input = $('<select name="' + i + '">');
                    for (var j in options.options[i].values) {
                        input.append('<option value="' + j + '">' + j + '</option>');
                    }
                    field_container.append($('<div id="option-' + field_name + '">').append(input).append('<div class="children">'));
                }

                // Get the selected field value.
                var value = parent.find('#option-' + field_name + ' [name="' + i + '"]').val();

                // Update the child fields
                if (typeof options.options[i].values != 'undefined' && typeof options.options[i].values[value] == 'object') {
                    if (options.options[i].values[value].hasOwnProperty('image')) {
                        self.popupImg = options.options[i].values[value].image;
                    }
                    var child_options = {};
                    $.extend(child_options, options, options.options[i].values[value]);
                    if (!options.options[i].values[value].hasOwnProperty('options')) {
                        delete child_options.options;
                    }
                    self.updateOptionsForm(i, child_options, parent.find('#option-' + field_name));
                }
            }
        },

        removeItem: function(event) {
            var target = $(event.target);
            var row = target.closest('tr');
            var request_id = ++self.requestId;
            $.ajax({
                url: '/api/cart',
                method: 'POST',
                dataType: 'json',
                data: {
                    product_id: row.data('product-id'),
                    options: row.data('options'),
                    action: 'remove-item',
                },
                success: function(data) {
                    lightning.modules.checkout.processUpdatedCart(data, request_id);
                }
            });
        },

        updateQty: function(event) {
            var target = $(event.target);
            var row = target.closest('tr');
            var new_qty = parseInt(target.val());
            if (isNaN(new_qty)) {
                return;
            }
            var request_id = ++self.requestId;
            $.ajax({
                url: '/api/cart',
                method: 'POST',
                dataType: 'json',
                data: {
                    product_id: row.data('product-id'),
                    options: row.data('options'),
                    action: 'set-qty',
                    qty: new_qty
                },
                success: function(data) {
                    lightning.modules.checkout.processUpdatedCart(data, request_id);
                }
            });
        },

        updateQtys: function(event) {
            // Get all the qtys to send.
            var items = [];
            $('.checkout-item').each(function(){
                var row = $(this);
                var qty_box = row.find('.checkout-qty');
                var qty = parseInt(qty_box.val());
                if (isNaN(qty)) {
                    qty_box.val(1);
                    qty = 1;
                }
                items.push({
                    product_id: row.data('product-id'),
                    options: row.data('options'),
                    qty: qty,
                });
            });

            // Update the qtys.
            var request_id = ++self.requestId;
            $.ajax({
                url: '/api/cart',
                method: 'POST',
                dataType: 'json',
                data: {
                    action: 'set-qtys',
                    items: items
                },
                success: function(data) {
                    lightning.modules.checkout.processUpdatedCart(data, request_id);
                }
            });
        },

        processUpdatedCart: function(data, request_id, suppress_display) {
            if (suppress_display == undefined) {
                suppress_display = false;
            }
            if (request_id > self.lastRequestId) {
                self.lastRequestId = request_id;
                self.updateCart(data.cart);
                if (!suppress_display) {
                    self.showCart();
                }
            }
        },

        pay: function() {
            var paymentHandler = lightning.get('modules.checkout.handler');
            if (paymentHandler) {
                var handler = lightning.getMethodReference(paymentHandler);
                handler({
                    amount: self.contents.total,
                    cart_id: self.contents.id,
                    shipping_address: self.contents.shipping_address,
                }, function(){
                    self.cartIcon.find('.item-count').html(0);
                    self.cartIcon.removeClass('show');
                    lightning.tracker.track(lightning.tracker.events.purchase, {
                        value: self.contents.total
                    });
                });
            }
        },

        updateCart: function(data) {
            // Update the cart contents.
            self.contents = data;
            self.contents.total
                = self.contents.subtotal
                + self.contents.shipping
                + self.contents.tax
                + self.contents.discounts.total;

            if (self.contents.items.length > 0) {
                // If there are items in the cart, show the cart button.
                if (!self.cartIcon) {
                    // Create the cart icon.
                    self.initIcon();
                }
                self.cartIcon.find('.item-count').html(self.contents.items.length);
                self.cartIcon.addClass('show');
            } else {
                // If the cart is empty, hide the cart button.
                if (self.cartIcon) {
                    self.cartIcon.find('.item-count').html(0);
                    self.cartIcon.removeClass('show');
                }
            }
        },

        initIcon: function() {
            var icon = $('<div id="checkout-side-icon"><div class="container"><i class="fa fa-shopping-cart"></i><div class="item-count">' + self.contents.items.length + '</div></div></div>');
            icon.appendTo('body');
            self.cartIcon = $('#checkout-side-icon')
                .addClass('show')
                .click(function(){
                    lightning.dialog.clear();
                    self.showCart();
                });
        },

        addDiscount: function(discount) {
            $.ajax({
                url: '/api/cart',
                method: 'POST',
                dataType: 'json',
                data: {
                    action: 'add-discount',
                    discount: discount,
                },
                success: function(data) {
                    self.updateCart(data.cart);
                    self.showCart();
                },
                error: function(data) {
                    $('.discount-result').html('The discount code is not valid.');
                }
            });
        },

        removeDiscount: function(discount) {

        },

        showCart: function() {
            var data = self.contents;
            var content = '', description = '';
            if (data.items && data.items.length > 0) {
                content += '<table class="checkout-cart">';
                content += '<tr><td></td><td class="qty">Qty</td><td class="hide-for-small">Item</td><td class="amount">Amount</td><td class="item-total">Total</td></tr>'
                for (var i in data.items) {
                    description = '<strong>' + data.items[i].title + '</strong>';
                    if (data.items[i].description) {
                        description += '<br>' + data.items[i].description;
                    }
                    if (data.items[i].options_formatted) {
                        description += '<br>' + data.items[i].options_formatted;
                    }

                    content += '<tr class="small-description"><td colspan="4">' + description + '</td></tr>';

                    content += '<tr class="checkout-item" data-product-id="' + data.items[i].product_id + '" data-options="' + data.items[i].options + '">';
                    content += '<td class="remove"><img src="/images/lightning/remove2.png"></td>';
                    content += '<td class="qty"><input name="checkout-qty" class="checkout-qty" value="' + data.items[i].qty + '" size="4"></td>';
                    content += '<td class="title hide-for-small">' + description + '</td>';
                    content += '<td class="amount">$' + parseFloat(data.items[i].price).toFixed(2) + '</td>';
                    content += '<td class="item-total">$' + (data.items[i].price * data.items[i].qty).toFixed(2) + '</td>';
                    content += '</tr>';
                }
                if (data.tax && data.tax > 0) {
                    content += '<tr class="final-rows"><td colspan="2"></td><td class="hide-for-small"></td><td>Tax:</td><td>$' + data.tax.toFixed(2) + '</td></tr>';
                }
                if (data.shipping && data.shipping > 0) {
                    content += '<tr class="final-rows"><td colspan="2"></td><td class="hide-for-small"></td><td>Shipping:</td><td>$' + data.shipping.toFixed(2) + '</td></tr>';
                }
                if (lightning.vars.modules.checkout.enable_discounts) {
                    var discountsField = '<div class="row">' +
                        '<div class="large-4 medium-12 column"><span class="form-inline">Add a discount:</span></div>' +
                        '<div class="large-4 medium-6 column"><input type="text" name="discount" value="" id="cart-discount" /></div>' +
                        '<div class="large-4 medium-6 column"><span class="button form-inline" onclick="lightning.modules.checkout.addDiscount($(\'#cart-discount\').val())">Add Discount</span><div class="discount-result"></div></div>' +
                        '</div>';
                    // Show added discounts.
                    if (data.discounts && data.discounts.total) {
                        content += '<tr class="final-rows hide-for-small">' +
                            '<td colspan="3" class="hide-for-small">' + discountsField + '</td>' +
                            '<td>Discounts:</td><td>$' + data.discounts.total.toFixed(2) + '</td>' +
                            '</tr>' +
                            '<tr class="final-rows small-description">' +
                            '<td colspan="2"></td>' +
                            '<td>Discounts:</td><td>$' + data.discounts.total.toFixed(2) + '</td>' +
                            '</tr>';
                    } else {
                        content += '<tr><td colspan="3">' + discountsField + '</td></tr>';
                    }
                }
                content += '<tr class="final-rows"><td colspan="2"></td><td class="hide-for-small"></td><td>Total:</td><td>$' + data.total.toFixed(2) + '</td></tr>';
                content += '</table>';
                content += '<div class="checkout-buttons">' +
                    '<span class="button medium checkout-update-total">Update Total</span><span class="button-spacer"></span>' +
                    '<span class="button red medium checkout-pay">Complete Order</span>' +
                    '</div>';
            } else {
                content = '<div><h2>Your cart is empty.</h2></div>';
            }
            lightning.dialog.showContent(content, false);
        }
    };
})();
