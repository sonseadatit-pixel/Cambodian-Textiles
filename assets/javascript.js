// ===== Header & Footer Loader (FINAL) =====

const isLocalhost = location.hostname === "127.0.0.1" || location.hostname === "localhost";
const repoBase = isLocalhost ? "" : "/" + location.pathname.split("/")[1];

function loadComponent(id, path, callback) {
    const el = document.getElementById(id);
    if (!el) return;

    fetch(`${repoBase}/${path}`)
        .then(res => res.text())
        .then(html => {
            // ✅ FIX ALL LINKS INSIDE HEADER/FOOTER
            el.innerHTML = html.replaceAll('href="', `href="${repoBase}/`);
            
            if (callback) callback();
        })
        .catch(err => console.error(err));
}

// Load components
loadComponent("header-container", "assets/components/header.html", () => {
    if (window.bootstrap) {
        document.querySelectorAll('[data-bs-toggle="collapse"]')
            .forEach(el => new bootstrap.Collapse(el, { toggle: false }));

        document.querySelectorAll('[data-bs-toggle="dropdown"]')
            .forEach(el => new bootstrap.Dropdown(el));
    }
});

loadComponent("footer-container", "assets/components/footer.html");

// Use the full URL, including the protocol and .supabase.co domain
const SUPABASE_URL = 'https://delhvakgfbqjwyyvmwka.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_QWd-KI9pc1vjC-ZobZnrCA_fBlz-RHe';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Views Product Navigation

function showProduct(){
    const urlParams = new URLSearchParams(window.location.search);
    const productID = urlParams.get('id');
    const allSections = document.querySelectorAll('.product-section');

    allSections.forEach(section => {
        section.style.display = 'none';
    });

    if(productID){
        const selectedSection = document.getElementById(productID);
        if(selectedSection){
            selectedSection.style.display = 'block';
        }
    } else {
        document.getElementById("healthcare").style.display = "block";
    }
}

window.addEventListener('load', showProduct);

// Product Filter Show

const params = new URLSearchParams(window.location.search);
const currentCategory = params.get("category");
const products = document.querySelectorAll(".product-item");
const boxes = document.querySelectorAll(".category-box");
const filterContainer = document.getElementById("filterButtons");

const subCategories = {
  medical: ["Scrub&Uniform", "Patientgown", "Surgicalgown","Medicallinen", "All"],
  hospitality: ["Hotel linen", "Bath Textiles", "F&B linen","Staff Uniforms" ,"All"],
  industrial: ["Workwear", "Safety Textiles", "Culinary&Food", "Industrial Cleaning", "All"],
  fnb: ["Uniforms", "Apparel", "Kitchen Textiles","Table Linen", "All"]
};

const mainImages = {
  medical: "../assets/Media/product-healthcare.png",
  hospitality: "../assets/Media/hotel-product.png",
  industrial: "../assets/Media/product-idustry.png",
  fnb: "../assets/Media/product-f&b.png"
};

const mainProduct = {
  medical: {icon: "../assets/Media/healtcare.png", name: "Healthcare" },
  hospitality: {icon: "../assets/Media/hotel.png", name: "Hospitality"},
  industrial: {icon: "../assets/Media/industrail.png", name: "Industrial & Workwear"},
  fnb: {icon: "../assets/Media/cutlery.png", name: "Food & Beverage"}
};

function showCategory(category) {
  const mainImgElement = document.getElementById("mainCategoryImg");
  if (mainImgElement && mainImages[category]) {
    mainImgElement.src = mainImages[category];
  }

  const mainH3Element = document.getElementById("mainCategoryProduct");
  if (mainH3Element && mainProduct[category]) {
    const data = mainProduct[category];
    mainH3Element.innerHTML = `
      <img src="${data.icon}" style="width: 32px; height: 32px; margin-right: 10px;">
      <span>${data.name}</span>
    `;
  }

  boxes.forEach(box => {
    box.classList.toggle("active", box.dataset.category === category);
  });

  const firstSub = subCategories[category][0].toLowerCase().replace(" ", "");
  renderSubFilters(category, firstSub);
  filterSubProducts(category, firstSub);
}

function renderSubFilters(category, activeSubValue) {
  filterContainer.innerHTML = ""; 
  if (!category || !subCategories[category]) return;

  subCategories[category].forEach(subName => {
    const btn = document.createElement("button");
    btn.className = "filter-btn mb-2";
    const subValue = subName.toLowerCase().replace(" ", "");

    if (subValue === activeSubValue) {
      btn.classList.add("active");
    }
    
    btn.innerText = subName;
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterSubProducts(category, subValue);
    };
    filterContainer.appendChild(btn);
  });
}

function filterSubProducts(mainCat, subCat) {
  products.forEach(item => {
    const matchMain = item.dataset.category === mainCat;
    const matchSub = (subCat === "all") || (item.dataset.sub === subCat);
    item.style.display = (matchMain && matchSub) ? "block" : "none";
  });
}

boxes.forEach(box => {
  box.addEventListener("click", () => {
    const selected = box.dataset.category;
    window.history.pushState({}, "", "?category=" + selected);
    showCategory(selected);
  });
});

showCategory(currentCategory || "medical");

let selectedColor = null;

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.color-btn').forEach(button => {
    button.addEventListener('click', function() {
      // remove active from all
      document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
      
      // add active to the clicked one
      this.classList.add('active');
      
      // store selected color
      selectedColor = this.style.backgroundColor;
      console.log("Selected color:", selectedColor);
    });
  });
});

// Forms (Contact & Quote)

async function handleContactSubmit(event) {
    event.preventDefault();

    const alertBox = document.getElementById('formAlert');
    const btn = document.getElementById('submitBtn');

    const name = document.getElementById('contactName').value.trim();
    const company = document.getElementById('contactCompany').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    btn.innerText = "Sending...";
    btn.disabled = true;

     const { error } = await supabaseClient
        .from('Contact')
        .insert([{
            name: name,
            company_name: company,
            email: email,
            phone_number: phone,
            messages: message
        }]);

    if (!error) {
        try {
             await fetch('https://delhvakgfbqjwyyvmwka.supabase.co/functions/v1/notify-staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    company_name: company,
                    email: email,
                    phone_number: phone,
                    message: message
                })
            });

            alertBox.className = "alert alert-success";
            alertBox.innerText = "✔️ Message sent and staff notified!";
            document.getElementById('contactUsForm').reset();

        } catch (err) {
            console.error(err);
            alertBox.className = "alert alert-warning";
            alertBox.innerText = "Saved, but email not sent.";
        }
    } else {
        alertBox.className = "alert alert-danger";
        alertBox.innerText = "❌ " + error.message;
    }

    alertBox.classList.remove("d-none");

    btn.innerText = "Submit";
    btn.disabled = false;

    setTimeout(() => {
        alertBox.classList.add("d-none");
    }, 4000);
}


async function handleQuoteSubmit(event) {
    event.preventDefault();

    const alertBox = document.getElementById('quoteAlert');
    const btn = document.getElementById('quoteSubmitBtn');

    const name = document.getElementById('quoteName').value.trim();
    const email = document.getElementById('quoteEmail').value.trim();
    const company = document.getElementById('quoteCompany').value.trim();
    const phone = document.getElementById('quotePhone').value.trim();
    const product = document.getElementById('quoteProductType').value;
    const quantity = document.getElementById('quoteQuantity').value;
    const country = document.getElementById('quoteCountry').value;
    const message = document.getElementById('quoteMessage').value.trim();

    if (!alertBox || !btn) {
        console.error("Missing quoteAlert or quoteSubmitBtn");
        return;
    }

    if (phone.length < 8) {
        alertBox.className = "alert alert-danger";
        alertBox.innerText = "❌ Invalid phone number!";
        alertBox.classList.remove("d-none");
        return;
    }

    btn.innerText = "Sending...";
    btn.disabled = true;

    // ✅ 1. Save to Supabase
    const { error } = await supabaseClient
        .from('Quote')
        .insert([{
            name: name,
            email: email,
            company_name: company,
            phone_number: phone,
            product_type: product,
            quantity: quantity,
            country: country,
            messages: message
        }]);

    if (!error) {
        try {
             await fetch('https://delhvakgfbqjwyyvmwka.supabase.co/functions/v1/notify-staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                
                body: JSON.stringify({
                    name: name,
                    email: email,
                    company_name: company,
                    phone_number: phone,
                    product: product,
                    quantity: quantity,
                    country: country,
                    message: message
                })

            });

            alertBox.className = "alert alert-success";
            alertBox.innerText = "✔️ Quote request sent & staff notified!";
            document.getElementById('quoteRequestForm').reset();

        } catch (err) {
            console.error(err);
            alertBox.className = "alert alert-warning";
            alertBox.innerText = "Saved, but email failed.";
        }

    } else {
        alertBox.className = "alert alert-danger";
        alertBox.innerText = "❌ " + error.message;
    }

    alertBox.classList.remove("d-none");

    btn.innerText = "Submit Quote";
    btn.disabled = false;

    setTimeout(() => {
        alertBox.classList.add("d-none");
    }, 4000);
}



