// Resubmit Shipment JavaScript
document.addEventListener("DOMContentLoaded", () => {
  // Modal elements
  const confirmSubmissionModal = document.getElementById(
    "confirmSubmissionModal"
  );
  const closeConfirmSubmissionModal = document.getElementById(
    "closeConfirmSubmissionModal"
  );
  const cancelSubmissionBtn = document.getElementById("cancelSubmissionBtn");
  const confirmSubmissionBtn = document.getElementById("confirmSubmissionBtn");
  const confirmSubmissionBtnText = confirmSubmissionBtn
    ? confirmSubmissionBtn.querySelector(".btn-text")
    : null;
  const confirmSubmissionBtnSpinner = confirmSubmissionBtn
    ? confirmSubmissionBtn.querySelector(".spinner")
    : null;

  // Form elements
  const submitShipmentForm = document.getElementById("submitShipmentForm");
  const submitButton = document.querySelector(".btn-submit");

  // Status mapping for display
  const statusMapping = {
    pending_admin: "Pending Admin Review",
    rejected_by_admin: "Rejected by Admin",
    pending_customs: "Pending Customs Review",
    rejected_by_customs: "Rejected by Customs",
    approved: "Approved",
  };

  // Show confirmation modal
  const showConfirmationModal = () => {
    if (confirmSubmissionModal) {
      confirmSubmissionModal.style.display = "flex";
    }
  };

  // Hide confirmation modal
  const hideConfirmationModal = () => {
    if (confirmSubmissionModal) {
      confirmSubmissionModal.style.display = "none";
    }
    resetConfirmSubmissionButton();
  };

  // Reset confirm submission button state
  const resetConfirmSubmissionButton = () => {
    if (
      confirmSubmissionBtn &&
      confirmSubmissionBtnText &&
      confirmSubmissionBtnSpinner
    ) {
      confirmSubmissionBtn.disabled = false;
      confirmSubmissionBtnText.style.display = "inline";
      confirmSubmissionBtnSpinner.style.display = "none";
    }
  };

  // Show loading state on confirm submission button
  const showSubmissionLoadingState = () => {
    if (
      confirmSubmissionBtn &&
      confirmSubmissionBtnText &&
      confirmSubmissionBtnSpinner
    ) {
      confirmSubmissionBtn.disabled = true;
      confirmSubmissionBtnText.style.display = "none";
      confirmSubmissionBtnSpinner.style.display = "inline-block";
    }
  };

  // Update submanifest status in the UI
  const updateSubmanifestStatus = (status) => {
    const statusElement = document.querySelector(".submanifest-status");
    if (statusElement && statusMapping[status]) {
      statusElement.textContent = statusMapping[status];
      console.log("Status updated to:", statusMapping[status]);
    }
  };

  // Handle form submission
  const handleFormSubmission = async () => {
    if (!submitShipmentForm) {
      console.error("Form not found");
      return;
    }

    showSubmissionLoadingState();

    try {
      // Create FormData from the form
      const formData = new FormData(submitShipmentForm);

      // Get the current URL for the POST request (should be the edit URL)
      const currentUrl = window.location.href;

      console.log("Submitting form to:", currentUrl);

      // Submit the form
      const response = await fetch(currentUrl, {
        method: "POST",
        body: formData,
        headers: {
          "X-CSRFToken": csrftoken,
        },
      });

      // Parse response
      const result = await response.json();

      if (response.ok && result.success) {
        console.log("Submission successful:", result);

        // Update status if provided
        if (result.status) {
          updateSubmanifestStatus(result.status);
        }

        // Show success message
        const message =
          result.message || "Submanifest resubmitted successfully";
        showToast(message, false);

        // Hide modal
        hideConfirmationModal();

        // Optional: Redirect after a delay if redirect_url is provided
        if (result.redirect_url) {
          setTimeout(() => {
            window.location.href = result.redirect_url;
          }, 2000);
        }
      } else {
        // Handle validation errors or other issues
        const errorMessage =
          result.error || result.message || "Failed to resubmit submanifest";

        if (result.errors) {
          // Handle field-specific errors
          console.log("Validation errors:", result.errors);
          // You can display these errors next to the fields if needed
          const firstError = Object.values(result.errors)[0];
          showToast(
            Array.isArray(firstError) ? firstError[0] : firstError,
            true
          );
        } else {
          showToast(errorMessage, true);
        }

        resetConfirmSubmissionButton();
      }
    } catch (error) {
      console.error("Submission error:", error);
      showToast("Network error. Please try again.", true);
      resetConfirmSubmissionButton();
    }
  };

  // Event Listeners

  // Prevent default form submission and show modal instead
  if (submitShipmentForm) {
    submitShipmentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showConfirmationModal();
    });
  }

  // Handle submit button click (in case form doesn't catch it)
  if (submitButton) {
    submitButton.addEventListener("click", (e) => {
      e.preventDefault();
      showConfirmationModal();
    });
  }

  // Modal close events
  if (closeConfirmSubmissionModal) {
    closeConfirmSubmissionModal.addEventListener(
      "click",
      hideConfirmationModal
    );
  }

  if (cancelSubmissionBtn) {
    cancelSubmissionBtn.addEventListener("click", hideConfirmationModal);
  }

  // Confirm submission button
  if (confirmSubmissionBtn) {
    confirmSubmissionBtn.addEventListener("click", handleFormSubmission);
  }

  // Close modal when clicking outside
  if (confirmSubmissionModal) {
    confirmSubmissionModal.addEventListener("click", (e) => {
      if (e.target === confirmSubmissionModal) {
        hideConfirmationModal();
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      confirmSubmissionModal &&
      confirmSubmissionModal.style.display === "flex"
    ) {
      hideConfirmationModal();
    }
  });

  console.log("Resubmit shipment JavaScript loaded successfully");
});
