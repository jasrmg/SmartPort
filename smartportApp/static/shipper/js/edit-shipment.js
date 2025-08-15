// Document deletion modal handler
document.addEventListener("DOMContentLoaded", () => {
  // Modal elements
  const deleteModal = document.getElementById("confirmDeleteDocsModal");
  const closeModalBtn = document.getElementById("closeDeleteDocsModal");
  const cancelBtn = document.getElementById("cancelRemoveUploadBtn");
  const confirmBtn = document.getElementById("confirmDeleteDocsBtn");
  const confirmBtnText = confirmBtn.querySelector(".btn-text");
  const confirmBtnSpinner = confirmBtn.querySelector(".spinner");

  let pendingDocumentId = null;
  let pendingDocumentElement = null;

  // Show modal function
  const showDeleteModal = (documentId, documentElement) => {
    pendingDocumentId = documentId;
    pendingDocumentElement = documentElement;
    deleteModal.style.display = "flex";
  };

  // Hide modal function
  const hideDeleteModal = () => {
    deleteModal.style.display = "none";
    pendingDocumentId = null;
    pendingDocumentElement = null;
    resetConfirmButton();
  };

  // Reset confirm button state
  const resetConfirmButton = () => {
    confirmBtn.disabled = false;
    confirmBtnText.style.display = "inline";
    confirmBtnSpinner.style.display = "none";
  };

  // Show loading state on confirm button
  const showLoadingState = () => {
    confirmBtn.disabled = true;
    confirmBtnText.style.display = "none";
    confirmBtnSpinner.style.display = "inline-block";
  };

  // Event delegation for remove buttons (handles dynamically added content)
  document.addEventListener("click", function (e) {
    if (e.target.closest(".remove-preview-btn")) {
      e.preventDefault();
      e.stopPropagation();

      const button = e.target.closest(".remove-preview-btn");
      const documentId = button.dataset.docId;
      const documentWrapper = button.closest(".file-preview-wrapper");

      if (documentId && documentWrapper) {
        showDeleteModal(documentId, documentWrapper);
      }
    }
  });

  // Modal close events
  closeModalBtn.addEventListener("click", hideDeleteModal);
  cancelBtn.addEventListener("click", hideDeleteModal);

  // Close modal when clicking outside
  deleteModal.addEventListener("click", function (e) {
    if (e.target === deleteModal) {
      hideDeleteModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && deleteModal.style.display === "flex") {
      hideDeleteModal();
    }
  });

  // Confirm deletion
  confirmBtn.addEventListener("click", async function () {
    if (!pendingDocumentId || !pendingDocumentElement) return;

    showLoadingState();
    try {
      const response = await fetch(`/documents/delete/${pendingDocumentId}/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Find the parent elements before removal
        const previewArea =
          pendingDocumentElement.closest(".file-preview-area");
        const cardElement = pendingDocumentElement.closest(
          ".document-type-card"
        );

        console.log("=== DELETION DEBUG START ===");
        console.log("pendingDocumentElement:", pendingDocumentElement);
        console.log("previewArea:", previewArea);
        console.log("cardElement:", cardElement);
        console.log(
          "cardElement.id:",
          cardElement ? cardElement.id : "NO CARD ELEMENT"
        );

        // Animate the document element removal
        pendingDocumentElement.style.opacity = "0";
        pendingDocumentElement.style.transform = "scale(0.8)";
        pendingDocumentElement.style.transition = "all 0.3s ease";

        setTimeout(() => {
          console.log("About to remove document element");

          // Try multiple ways to remove the element
          if (pendingDocumentElement && pendingDocumentElement.parentNode) {
            pendingDocumentElement.parentNode.removeChild(
              pendingDocumentElement
            );
            console.log(
              "Document element removed using parentNode.removeChild"
            );
          } else if (pendingDocumentElement) {
            pendingDocumentElement.remove();
            console.log("Document element removed using element.remove()");
          }

          // Double-check by looking for elements in the preview area
          const remainingElements = previewArea
            ? previewArea.querySelectorAll(".file-preview-wrapper")
            : [];
          console.log(
            "Remaining file-preview-wrapper elements:",
            remainingElements.length
          );

          // Check if the preview area is now empty AFTER the element is removed
          console.log(
            "Preview area children count AFTER removal:",
            previewArea ? previewArea.children.length : "NO PREVIEW AREA"
          );

          // Use both checks: children.length === 0 AND no file-preview-wrapper elements
          if (
            previewArea &&
            (previewArea.children.length === 0 ||
              remainingElements.length === 0)
          ) {
            console.log("Preview area is empty, processing card...");

            // Clear the filename container if it exists
            if (cardElement) {
              console.log("Processing card element with ID:", cardElement.id);

              const fileNameContainer = cardElement.querySelector(
                ".uploaded-file-name"
              );
              if (fileNameContainer) {
                fileNameContainer.textContent = "";
                console.log("Cleared filename container");
              }
              cardElement.classList.remove("has-existing-file");
              console.log("Removed 'has-existing-file' class");

              // Check if this is an "other" type card - if so, remove the entire card
              const isOtherCard =
                cardElement.id && cardElement.id.startsWith("other_");
              console.log("Is other card?", isOtherCard);
              console.log(
                "Card ID starts with 'other_'?",
                cardElement.id ? cardElement.id.startsWith("other_") : "NO ID"
              );

              if (isOtherCard) {
                console.log("REMOVING OTHER CARD - Starting animation...");
                // Remove the entire card for "other" type
                setTimeout(() => {
                  console.log("Applying removal styles to card");
                  cardElement.style.opacity = "0";
                  cardElement.style.transform = "scale(0.95)";
                  cardElement.style.transition = "all 0.2s ease";

                  setTimeout(() => {
                    console.log("Removing card from DOM");
                    cardElement.remove();
                    console.log("Card removed successfully");
                  }, 200);
                }, 100);
              } else {
                console.log("NOT an other card - keeping card for new uploads");
              }
              // For non-other cards, keep the card but make it clickable for new uploads
            } else {
              console.log("NO CARD ELEMENT FOUND!");
            }
          } else {
            console.log("Preview area still has children or doesn't exist");
            if (previewArea) {
              console.log("Remaining children:", previewArea.children);
              // Force remove any remaining file-preview-wrapper elements
              const wrappers = previewArea.querySelectorAll(
                ".file-preview-wrapper"
              );
              console.log(
                "Found",
                wrappers.length,
                "file-preview-wrapper elements to remove"
              );
              wrappers.forEach((wrapper, index) => {
                console.log(`Forcing removal of wrapper ${index}:`, wrapper);
                wrapper.remove();
              });

              // Check again after force removal
              setTimeout(() => {
                console.log(
                  "After force removal - children count:",
                  previewArea.children.length
                );
                if (
                  previewArea.children.length === 0 &&
                  cardElement &&
                  cardElement.id &&
                  cardElement.id.startsWith("other_")
                ) {
                  console.log(
                    "FORCE REMOVING OTHER CARD after cleaning wrappers"
                  );
                  cardElement.style.opacity = "0";
                  cardElement.style.transform = "scale(0.95)";
                  cardElement.style.transition = "all 0.2s ease";

                  setTimeout(() => {
                    cardElement.remove();
                    console.log("Card force removed successfully");
                  }, 200);
                }
              }, 50);
            }
          }
          console.log("=== DELETION DEBUG END ===");
        }, 300);

        // Show success message
        if (typeof showToast === "function") {
          showToast("Document deleted successfully", false);
        } else {
          console.log("Document deleted successfully");
        }

        hideDeleteModal();
      } else {
        throw new Error(result.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Delete error:", error);

      // Show error message
      if (typeof showToast === "function") {
        showToast(error.message || "Error deleting document", true);
      } else {
        alert("Error deleting document: " + error.message);
      }

      resetConfirmButton();
    }
  });

  const showToast = (msg, isError = false, duration = 2500) => {
    const toast = document.createElement("div");
    toast.className = `custom-toast ${isError ? "error" : ""}`;
    toast.textContent = msg;

    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("transitionend", () => toast.remove());
    }, duration);
  };
});
