颜色主题
日间 / 夜间
default slate
<script> var buttons = document.querySelectorAll("button[data-md-color-scheme]") buttons.forEach(function(button) { button.addEventListener("click", function() { var attr = this.getAttribute("data-md-color-scheme") document.body.setAttribute("data-md-color-scheme", attr) localStorage.setItem("data-md-color-scheme",attr); updateScheme(); }) }) </script>
主色
red pink purple indigo blue cyan teal green lime orange brown grey black white
<script> var buttons = document.querySelectorAll("button[data-md-color-primary]") buttons.forEach(function(button) { button.addEventListener("click", function() { var attr = this.getAttribute("data-md-color-primary") document.body.setAttribute("data-md-color-primary", attr) localStorage.setItem("data-md-color-primary",attr); }) }) </script>