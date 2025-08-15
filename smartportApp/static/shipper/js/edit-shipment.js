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
      const response = await fetch(`/delete-document/${pendingDocumentId}/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCsrfToken(),
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Remove the document element from DOM with animation
        pendingDocumentElement.style.opacity = "0";
        pendingDocumentElement.style.transform = "scale(0.8)";
        pendingDocumentElement.style.transition = "all 0.3s ease";

        setTimeout(() => {
          pendingDocumentElement.remove();

          // Check if the preview area is now empty
          const previewArea =
            pendingDocumentElement.closest(".file-preview-area");
          if (previewArea && previewArea.children.length === 0) {
            // Clear the filename container if it exists
            const cardElement = previewArea.closest(".document-type-card");
            if (cardElement) {
              const fileNameContainer = cardElement.querySelector(
                ".uploaded-file-name"
              );
              if (fileNameContainer) {
                fileNameContainer.textContent = "";
              }
              cardElement.classList.remove("has-existing-file");
            }
          }
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

  // Helper function to get CSRF token
  function getCsrfToken() {
    const token = document.querySelector("[name=csrfmiddlewaretoken]");
    if (token) {
      return token.value;
    }

    // Alternative: get from cookie
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "csrftoken") {
        return value;
      }
    }

    // Alternative: get from meta tag (if you have it)
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
      return meta.getAttribute("content");
    }

    return "";
  }
});
