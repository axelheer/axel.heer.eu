$(function () {
    // parent selector hack
    (function () {
        $("p > img:only-child").css("max-width", "90%")
                               .parent()
                               .css("text-align", "center");
    }());

    // pretend responsiveness
    (function () {
        var w = $(window),
            c = $("#tags"),
            p = $("#posts");
        w.scroll(function () {
            c.css("marginTop",
                Math.max(
                    0,
                    Math.min(
                        w.scrollTop() - p.offset().top +
                            (w.innerHeight() - c.outerHeight()) / 4,
                        p.outerHeight() - c.outerHeight()
                    )
                ) + "px"
            );
        });
    }());

    // scale / shuffle tag cloud
    (function () {
        var cloud = $("#tags"),
            ordered = cloud.find(".tag").get(),
            shuffled = $.map(ordered, function () {
                var rand = Math.floor(Math.random() * ordered.length),
                    node = ordered[rand];
                ordered.splice(rand, 1);
                return node;
            }),
            total = parseInt(cloud.data("weight"), 10);
        $(shuffled).each(function () {
            var tag = $(this),
                part = parseInt(tag.data("weight"), 10),
                ratio = Math.log(part) / Math.log(total);
            tag.css("font-size", (100 + 150 * ratio) + "%");
            tag.appendTo(cloud);
        });
    }());

    // photo galleries
    (function () {
        $("#posts .photo-post .post-title + p").each(function () {
            $(this).galleria({
                height: 2 / 3,
                lightbox: true,
                imageCrop: true,
                transition: "fade"
            });
        });
    }());

    // init stars
    (function () {
        stars.init(60);
    }());
});
