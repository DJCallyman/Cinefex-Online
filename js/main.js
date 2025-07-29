// Centralized navigation controller for Cinefex Archive
let currentIssue = '8'; // Default to earliest available issue
let currentPage = 1;
const totalPages = {
    '8': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72]
};

function navigateIssue(issueNumber) {
    currentIssue = issueNumber;
    currentPage = totalPages[issueNumber][0];
    updatePageInfo();
    loadContent();
}

function nextPage() {
    const pages = totalPages[currentIssue];
    const currentIndex = pages.indexOf(currentPage);
    if (currentIndex < pages.length - 1) {
        currentPage = pages[currentIndex + 1];
        updatePageInfo();
        loadContent();
    }
}

function prevPage() {
    const pages = totalPages[currentIssue];
    const currentIndex = pages.indexOf(currentPage);
    if (currentIndex > 0) {
        currentPage = pages[currentIndex - 1];
        updatePageInfo();
        loadContent();
    }
}

function updatePageInfo() {
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages[currentIssue].length;
}

function loadContent() {
    document.getElementById('contentFrame').src = `./${currentIssue}/ArchivalView.html#page-${currentPage}`;
}
