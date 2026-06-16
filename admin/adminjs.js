const SUPABASE_URL = 'https://delhvakgfbqjwyyvmwka.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QWd-KI9pc1vjC-ZobZnrCA_fBlz-RHe';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================= GLOBAL =================
let lastContactCount = 0;
let lastQuoteCount = 0;

let notifications = [];

let dashboardData = [];
let filteredData = [];
let currentPage = 1;
const pageSize = 5;

let chart;

let currentFilterType = "all";
let currentFilterStatus = "all";
let currentSearch = "";

let contactData = [];
let filteredContactData = [];
let currentContactSearch = "";
let contactPage = 1;
const contactPageSize = 10;

let quoteData = [];
let filteredQuoteData = [];
let currentQuoteSearch = "";
let quotePage = 1;
const quotePageSize = 10;

// ================= SECTION =================
function showSection(sectionId, element) {
    document.querySelectorAll("main section").forEach(sec => {
        sec.classList.remove("active-section");
    });

    document.getElementById(sectionId).classList.add("active-section");

    document.querySelectorAll("#sidebar .nav-link").forEach(link => {
        link.classList.remove("active");
    });

    if (element) element.classList.add("active");
}
document.getElementById("sidebarToggle").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const icon = document.getElementById("toggleIcon");

    sidebar.classList.toggle("collapsed");

     if (sidebar.classList.contains("collapsed")) {
        icon.classList.remove("fa-angle-left");
        icon.classList.add("fa-angle-right");
    } else {
        icon.classList.remove("fa-angle-right");
        icon.classList.add("fa-angle-left");
    }
});
// Session check  
window.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "../login/login.html";
        return;
    }

    const emailElement = document.getElementById("userEmail");
    if (emailElement) {
        emailElement.innerText = session.user.email;
    }

    const firstMenu = document.querySelector("#sidebar .nav-link");
    if (firstMenu) {
        showSection("dashboard", firstMenu);
    }

    loadDashboard();
    loadContacts();
    loadQuotes();
    startAutoRefresh();
});

// Log Out
async function logout() {
    await supabaseClient.auth.signOut();
    localStorage.clear();
    window.location.href = "../login/login.html";
}

// Auto logout  
window.addEventListener("beforeunload", async () => {
    await supabaseClient.auth.signOut();
});


// Dashboard ( Contact and Quote)
async function loadDashboard() {

    const { data: contacts } = await supabaseClient.from("Contact").select("*");
    const { data: quotes } = await supabaseClient.from("Quote").select("*");

    dashboardData = [
        ...contacts.map(i => ({ ...i, type: "Contact" })),
        ...quotes.map(i => ({ ...i, type: "Quote" }))
    ];

    dashboardData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    document.getElementById("totalContacts").innerText = contacts.length;
    document.getElementById("totalQuotes").innerText = quotes.length;

    let pending = 0;
    let done = 0;

    dashboardData.forEach(item => {
        if (item.status === "pending") pending++;
        else done++;
    });

    document.getElementById("totalPending").innerText = pending;
    document.getElementById("totalDone").innerText = done;

    document.getElementById("dashboardSearch").value = currentSearch;
    document.getElementById("typeFilter").value = currentFilterType;
    document.getElementById("statusFilter").value = currentFilterStatus;

    applyDashboardFilter();
    renderChartMonthly(contacts, quotes);
}

// ================= FILTER =================
function filterDashboard() {
    currentSearch = document.getElementById("dashboardSearch").value.toLowerCase();
    currentFilterType = document.getElementById("typeFilter").value;
    currentFilterStatus = document.getElementById("statusFilter").value;
    applyDashboardFilter();
}

function applyDashboardFilter() {

    filteredData = dashboardData.filter(item => {

        const textMatch =
            (item.name || "").toLowerCase().includes(currentSearch) ||
            (item.email || "").toLowerCase().includes(currentSearch) ||
            (item.company_name || "").toLowerCase().includes(currentSearch);

        const typeMatch =
            currentFilterType === "all" ||
            item.type.toLowerCase() === currentFilterType.toLowerCase();

        const statusMatch =
            currentFilterStatus === "all" ||
            item.status.toLowerCase() === currentFilterStatus.toLowerCase();

        return textMatch && typeMatch && statusMatch;
    });

    currentPage = 1;
    updateDashboardTable();   // ✅ FIXED
}

// ================= TABLE =================
function updateDashboardTable() {
    const table = document.getElementById("dashboardTable");
    const info = document.getElementById("dashboardInfo");
    const paginationBox = document.getElementById("pagination");  
    table.innerHTML = "";

    const startIndex = (currentPage - 1) * pageSize;
    const pageData = filteredData.slice(startIndex, startIndex + pageSize);

    pageData.forEach(item => {
        const date = new Date(item.created_at).toLocaleString();
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.email}</td>
            <td>${item.company_name || "-"}</td>
            <td><span class="badge bg-${item.type === "Contact" ? "info" : "primary"}">${item.type}</span></td>
            <td><span class="badge bg-${item.status === "done" ? "success" : "warning"}">${item.status}</span></td>
            <td>${date}</td>
        `;
        table.appendChild(row);
    });

    // Footer message update
    if (info) {
        if (filteredData.length === 0) {
            info.innerText = "No records found";
        } else {
            const start = startIndex + 1;
            const end = startIndex + pageData.length;
            info.innerText = `Showing ${start}-${end} of ${filteredData.length} records`;
        }
    }

    // Show pagination
    if (paginationBox) {
        paginationBox.style.display = "block";
        renderPagination();
    }
}

// ================= PAGINATION =================
function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const box = document.getElementById("pagination");
    box.innerHTML = "";

    const prev = document.createElement("button");
    prev.innerText = "<";
    prev.className = "btn btn-sm btn-light";
    prev.disabled = currentPage === 1;
    prev.onclick = () => { 
        currentPage--; 
        updateDashboardTable(); 
    };
    box.appendChild(prev);

    // Sliding window: show 3 pages at a time
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);

    // Adjust if near the end
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = "btn btn-sm " + (i === currentPage ? "btn-info" : "btn-light");
        btn.onclick = () => { 
            currentPage = i; 
            updateDashboardTable(); 
        };
        box.appendChild(btn);
    }

    const next = document.createElement("button");
    next.innerText = ">";
    next.className = "btn btn-sm btn-light";
    next.disabled = currentPage === totalPages;
    next.onclick = () => { 
        currentPage++; 
        updateDashboardTable(); 
    };
    box.appendChild(next);
}


// ================= CHART =================
function renderChartMonthly(contacts, quotes) {

    const ctx = document.getElementById("dashboardChart");
    if (!ctx) return;
    if (chart) chart.destroy();

    let contactMonths = new Array(12).fill(0);
    let quoteMonths = new Array(12).fill(0);

    contacts.forEach(i => {
        if (i.created_at) contactMonths[new Date(i.created_at).getMonth()]++;
    });

    quotes.forEach(i => {
        if (i.created_at) quoteMonths[new Date(i.created_at).getMonth()]++;
    });

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
            datasets: [
                { label: "Contacts", data: contactMonths, backgroundColor: "#0dcaf0" },
                { label: "Quotes", data: quoteMonths, backgroundColor: "#6610f2" }
            ]
        }
    });
}

// ================= CONTACT =================
async function loadContacts() {
    console.log("Refresh clicked, loading contacts...");
    const { data, error } = await supabaseClient
        .from("Contact")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase error:", error);
        return;
    }

    contactData = data || [];
    filteredContactData = [...contactData];
    contactPage = 1;

    renderContactTable();
}


function renderContactTable() {
    const table = document.getElementById("contactTable");
    const info = document.getElementById("contactInfo"); 

    // Clear table before rendering
    table.innerHTML = "";

    const start = (contactPage - 1) * contactPageSize;
    const end = Math.min(start + contactPageSize, filteredContactData.length);
    const pageData = filteredContactData.slice(start, end);

    pageData.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.email}</td>
            <td>${item.company_name}</td>
            <td>${item.phone_number}</td>
            <td>${item.messages}</td>
            <td>
    <button 
        class="btn btn-sm 
               ${item.status === 'done' ? 'btn-success' : 'btn-warning'}" 
        onclick="updateStatus('${item.id}', '${item.status}', 'Contact')">
        ${item.status}
    </button>
</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteContact('${item.id}')">Delete</button></td>
            <td>${new Date(item.created_at).toLocaleString()}</td>
        `;
        table.appendChild(row);
    });

    renderContactPagination();

    // Footer message update
    if (info) {
        if (filteredContactData.length === 0) {
            info.innerText = "No records found";
        } else {
            info.innerText = `Showing ${start + 1}-${end} of ${filteredContactData.length} records`;
        }
    }
}


function renderContactPagination() {

    const totalPages = Math.ceil(filteredContactData.length / contactPageSize);
    const box = document.getElementById("contactPagination");
    if (!box) return;

    box.innerHTML = "";

    const prev = document.createElement("button");
    prev.innerText = "<";
    prev.className = "btn btn-sm btn-light";
    prev.disabled = contactPage === 1;
    prev.onclick = () => {
        contactPage--;
        renderContactTable();
    };
    box.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = "btn btn-sm " + (i === contactPage ? "btn-info" : "btn-light");
        btn.onclick = () => {
            contactPage = i;
            renderContactTable();
        };
        box.appendChild(btn);
    }

    const next = document.createElement("button");
    next.innerText = ">";
    next.className = "btn btn-sm btn-light";
    next.disabled = contactPage === totalPages;
    next.onclick = () => {
        contactPage++;
        renderContactTable();
    };
    box.appendChild(next);
}

function filterContact() {
    currentContactSearch = document.getElementById("contactSearch").value.toLowerCase();
    applyContactFilter();
}

function applyContactFilter() {

    filteredContactData = contactData.filter(item =>
        (item.name || "").toLowerCase().includes(currentContactSearch) ||
        (item.email || "").toLowerCase().includes(currentContactSearch) ||
        (item.company_name || "").toLowerCase().includes(currentContactSearch)
    );

    contactPage = 1;
    renderContactTable();
}

// Delete row in table
async function deleteContact(id) {
    if (!confirm("Are you sure you want to delete this?")) {
        return;
    }
    await supabaseClient
        .from("Contact")
        .delete()
        .eq("id", id);

    loadContacts();
    loadDashboard();
}

// ================= QUOTE =================

async function loadQuotes() {
    console.log("Quote Refresh clicked, loading quotes...");

    const { data, error } = await supabaseClient
        .from("Quote")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase error:", error);
        return;
    }

    quoteData = data || [];
    
    if (lastQuoteCount !== 0 && quoteData.length > lastQuoteCount) {
        showNotification("New Quote Request");
    }
    lastQuoteCount = quoteData.length;

    filteredQuoteData = [...quoteData];
    quotePage = 1;
    renderQuoteTable();
}


function renderQuoteTable() {
    const table = document.getElementById("quoteTable");
    const info = document.getElementById("quoteInfo");  
    table.innerHTML = "";

    const start = (quotePage - 1) * quotePageSize;
    const end = Math.min(start + quotePageSize, filteredQuoteData.length);
    const pageData = filteredQuoteData.slice(start, start + quotePageSize);

    pageData.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.email}</td>
            <td>${item.company_name}</td>
            <td>${item.phone_number}</td>
            <td>${item.product_type}</td>
            <td>${item.quantity}</td>
            <td>${item.country}</td>
            <td>${item.messages}</td>
            <td>
                <button 
                    class="btn btn-sm 
                        ${item.status === 'done' ? 'btn-success' : 'btn-warning'}" 
                    onclick="updateStatus('${item.id}', '${item.status}', 'Quote')">
                    ${item.status}
                </button>
            </td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteQuote('${item.id}')">Delete</button></td>
            <td>${new Date(item.created_at).toLocaleString()}</td>
        `;
        table.appendChild(row);
    });

    renderQuotePagination();

    // Update the display text here
    if (info) {
        if (filteredQuoteData.length === 0) {
            info.innerText = "Showing 0 of 0 records";
        } else {
            info.innerText = `Showing ${start + 1}-${end} of ${filteredQuoteData.length} records`;
        }
    }
}

function renderQuotePagination() {

    const totalPages = Math.ceil(filteredQuoteData.length / quotePageSize);
    const box = document.getElementById("quotePagination");
    if (!box) return;

    box.innerHTML = "";

    const prev = document.createElement("button");
    prev.innerText = "<";
    prev.className = "btn btn-sm btn-light";
    prev.disabled = quotePage === 1;
    prev.onclick = () => {
        quotePage--;
        renderQuoteTable();
    };
    box.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = "btn btn-sm " + (i === quotePage ? "btn-info" : "btn-light");
        btn.onclick = () => {
            quotePage = i;
            renderQuoteTable();
        };
        box.appendChild(btn);
    }

    const next = document.createElement("button");
    next.innerText = ">";
    next.className = "btn btn-sm btn-light";
    next.disabled = quotePage === totalPages;
    next.onclick = () => {
        quotePage++;
        renderQuoteTable();
    };
    box.appendChild(next);
}

function filterQuote() {

    const search = document.getElementById("quoteSearch").value.toLowerCase();

    filteredQuoteData = quoteData.filter(item =>
        (item.name || "").toLowerCase().includes(search) ||
        (item.email || "").toLowerCase().includes(search) ||
        (item.company_name || "").toLowerCase().includes(search)
    );

    quotePage = 1;
    renderQuoteTable();
}

// Delete row in table
async function deleteQuote(id) {
    if (!confirm("Are you sure you want to delete this?")) {
        return;
    }
    await supabaseClient
        .from("Quote")
        .delete()
        .eq("id", id);

    loadQuotes();
    loadDashboard();
}

// ================= ACTION =================
async function updateStatus(id, status, table) {
    const newStatus = status === "pending" ? "done" : "pending";

    await supabaseClient
        .from(table)
        .update({ status: newStatus })
        .eq("id", id);

    loadContacts();
    loadQuotes();
    loadDashboard();
}


// ================= NOTIFICATION =================
function showNotification(text) {
    const badge = document.getElementById("notifyCount");
    let count = parseInt(badge.innerText || "0");
    badge.innerText = count + 1;

    const now = new Date();

    notifications.unshift({
        message: text,
        time: now
    });
    renderNotificationList();
    const toast = document.createElement("div");
    toast.innerText = text;
    toast.style = "position:fixed;top:100px;right:50px;background:#00c6ff;color:white;padding:10px 20px;border-radius:6px;z-index:9999;";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function renderNotificationList() {
    const list = document.getElementById("notificationList");
    list.innerHTML = "";

    if (notifications.length === 0) {
        list.innerHTML = `
            <li class="text-center text-muted small">
                No notifications
            </li>`;
        return;
    }
    notifications.forEach(n => {
        const li = document.createElement("li");
        li.className = "dropdown-item small";
        li.innerHTML = `
            <div>${n.message}</div>
            <div class="text-muted small">${timeAgo(n.time)}</div>
        `;
        list.appendChild(li);
    });
}

function timeAgo(date) {

    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
}
document.getElementById("notifyBell").addEventListener("click", () => {
document.getElementById("notifyCount").innerText = "0";
});
// ================= AUTO REFRESH =================
function startAutoRefresh() {
    setInterval(loadContacts, 50000);
    setInterval(loadQuotes, 50000);
    setInterval(loadDashboard, 50000);
}