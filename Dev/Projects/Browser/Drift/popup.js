const websiteElement = document.getElementById("website");

if (!websiteElement) {
  console.error("Website element not found!");
} else {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];

    if (currentTab && currentTab.url) {
      const websiteURL = new URL(currentTab.url);

      websiteElement.textContent = websiteURL.hostname;
    }
  });
}
