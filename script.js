$(document).ready(function () {
  // Toggle mobile menu
  $(".menu_icon").click(function () {
    $(".navbar").toggleClass("showing");
  });

  // Sticky header on scroll
  $(window).scroll(function () {
    if ($(this).scrollTop() > 1) {
      $(".header-area").addClass("sticky");
    } else {
      $(".header-area").removeClass("sticky");
    }

    updateActiveSection();
  });

  // Smooth scrolling and menu link active state
  $(".navbar li a").click(function (e) {
    e.preventDefault();

    const target = $(this).attr("href");
    const targetElement = $(target);

    if (!targetElement.length || targetElement.hasClass("active-section")) {
      return;
    }

    let offset = 0;
    if (target === "#home") {
      offset = 0;
    } else {
      offset = targetElement.offset().top - 40;
    }

    $("html, body").animate({ scrollTop: offset }, 500);

    $(".navbar li a").removeClass("active");
    $(this).addClass("active");

    // Hide mobile menu after click
    if ($(window).width() <= 768) {
      $(".navbar").removeClass("showing");
    }
  });

  // ScrollReveal animations
  if (typeof ScrollReveal !== "undefined") {
    ScrollReveal({
      distance: "100px",
      duration: 2000,
      delay: 200,
    });

    ScrollReveal().reveal(".header a, .profile-photo, .about-content, .education", {
      origin: "left",
    });
    ScrollReveal().reveal(".header ul, .profile-text, .about-skills, .internship", {
      origin: "right",
    });
    ScrollReveal().reveal(".project-title, .contact-title", {
      origin: "top",
    });
    ScrollReveal().reveal(".projects, .contact", {
      origin: "bottom",
    });
  }

  // Contact form to Google Sheets
  const scriptURL =
    "https://script.google.com/macros/s/AKfycbzUSaaX3XmlE5m9YLOHOBrRuCh2Ohv49N9bs4bew7xPd1qlgpvXtnudDs5Xhp3jF-Fx/exec";
  const form = document.forms["submitToGoogleSheet"];
  const msg = document.getElementById("msg");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      fetch(scriptURL, { method: "POST", body: new FormData(form) })
        .then((response) => {
          msg.innerHTML = "Message sent successfully";
          setTimeout(() => {
            msg.innerHTML = "";
          }, 5000);
          form.reset();
        })
        .catch((error) => console.error("Error!", error.message));
    });
  }
});

// Update nav active class on scroll
function updateActiveSection() {
  const scrollPosition = $(window).scrollTop();

  // At top of page
  if (scrollPosition === 0) {
    $(".navbar li a").removeClass("active");
    $(".navbar li a[href='#home']").addClass("active");
    return;
  }

  $("section").each(function () {
    const id = $(this).attr("id");
    const offset = $(this).offset().top;
    const height = $(this).outerHeight();

    if (
      scrollPosition >= offset - 40 &&
      scrollPosition < offset + height - 40
    ) {
      $(".navbar li a").removeClass("active");
      $(".navbar li a[href='#" + id + "']").addClass("active");
    }
  });
}
