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

  // ========================================
  // === CHANGE TRACKING FUNCTIONALITY ===
  // ========================================

  let originalFormState = {};
  let hasFormChanges = false;

  // Capture initial form state
  const captureInitialFormState = () => {
    if (!submitShipmentForm) return;

    originalFormState = {
      // Basic form fields
      voyage_id: document.getElementById("voyageSelect")?.value || "",
      container_number: document.getElementById("containerNumber")?.value || "",
      seal_number: document.getElementById("sealNumber")?.value || "",
      consignor_name: document.getElementById("consignorName")?.value || "",
      consignor_email: document.getElementById("consignorEmail")?.value || "",
      consignor_address:
        document.getElementById("consignorAddress")?.value || "",
      consignee_name: document.getElementById("consigneeName")?.value || "",
      consignee_email: document.getElementById("consigneeEmail")?.value || "",
      consignee_address:
        document.getElementById("consigneeAddress")?.value || "",
      handling_instructions:
        document.getElementById("handlingInstructions")?.value || "",
      bill_of_lading_number:
        document.getElementById("billOfLadingNumber")?.value || "",

      // Cargo data - capture all existing cargo entries
      cargo: captureCargosState(),

      // Documents - capture existing document IDs and filenames
      documents: captureDocumentsState(),
    };

    console.log("Initial form state captured:", originalFormState);
    // Initially disable submit button
    updateSubmitButtonState(false);
  };

  // Capture current cargo state
  const captureCargosState = () => {
    const cargoEntries = document.querySelectorAll(".cargo-entry");
    const cargos = [];

    cargoEntries.forEach((entry, index) => {
      const cargoId = entry.dataset.cargoId || null;
      const description =
        entry.querySelector('textarea[name="cargo_description[]"]')?.value ||
        "";
      const additionalInfo =
        entry.querySelector('textarea[name="additional_info[]"]')?.value || "";
      const quantity =
        entry.querySelector('input[name="quantity[]"]')?.value || "";
      const weight = entry.querySelector('input[name="weight[]"]')?.value || "";
      const value = entry.querySelector('input[name="value[]"]')?.value || "";
      const hscode = entry.querySelector('input[name="hscode[]"]')?.value || "";

      cargos.push({
        id: cargoId,
        index: index,
        description,
        additionalInfo,
        quantity,
        weight,
        value,
        hscode,
      });
    });

    return cargos;
  };

  // Capture current documents state
  const captureDocumentsState = () => {
    const documents = {};

    // Capture existing backend documents by their preview wrappers
    document.querySelectorAll(".file-preview-wrapper").forEach((wrapper) => {
      const removeBtn = wrapper.querySelector(".remove-preview-btn");
      const docId = removeBtn?.dataset?.docId;
      const isNewFile = removeBtn?.dataset?.newFile === "true";
      const fileName =
        wrapper.querySelector(".file-name-label")?.textContent || "";
      const card = wrapper.closest(".document-type-card");
      const cardId = card?.id || "";

      if (docId && !isNewFile) {
        if (!documents[cardId]) {
          documents[cardId] = [];
        }
        documents[cardId].push({
          id: docId,
          fileName: fileName,
        });
      }
    });

    return documents;
  };

  // Check if form has changes
  const checkForChanges = () => {
    if (!submitShipmentForm) return false;

    const currentState = {
      voyage_id: document.getElementById("voyageSelect")?.value || "",
      container_number: document.getElementById("containerNumber")?.value || "",
      seal_number: document.getElementById("sealNumber")?.value || "",
      consignor_name: document.getElementById("consignorName")?.value || "",
      consignor_email: document.getElementById("consignorEmail")?.value || "",
      consignor_address:
        document.getElementById("consignorAddress")?.value || "",
      consignee_name: document.getElementById("consigneeName")?.value || "",
      consignee_email: document.getElementById("consigneeEmail")?.value || "",
      consignee_address:
        document.getElementById("consigneeAddress")?.value || "",
      handling_instructions:
        document.getElementById("handlingInstructions")?.value || "",
      bill_of_lading_number:
        document.getElementById("billOfLadingNumber")?.value || "",
      cargo: captureCargosState(),
      documents: captureDocumentsState(),
    };

    // Check basic fields
    for (const key in originalFormState) {
      if (key === "cargo" || key === "documents") continue;

      if (originalFormState[key] !== currentState[key]) {
        console.log(`Field changed: ${key}`, {
          original: originalFormState[key],
          current: currentState[key],
        });
        return true;
      }
    }

    // Check cargo changes
    if (hasCargoChanges(originalFormState.cargo, currentState.cargo)) {
      console.log("Cargo changes detected");
      return true;
    }

    // Check document changes
    if (
      hasDocumentChanges(originalFormState.documents, currentState.documents)
    ) {
      console.log("Document changes detected");
      return true;
    }

    // Check for new file uploads
    if (hasNewFileUploads()) {
      console.log("New file uploads detected");
      return true;
    }

    return false;
  };

  // Check if cargo has changes
  const hasCargoChanges = (originalCargos, currentCargos) => {
    // Different number of cargo entries
    if (originalCargos.length !== currentCargos.length) {
      return true;
    }

    // Check each cargo entry
    for (let i = 0; i < originalCargos.length; i++) {
      const original = originalCargos[i];
      const current = currentCargos[i];

      // Check if cargo was deleted/added (different IDs)
      if (original.id !== current.id) {
        return true;
      }

      // Check field changes
      if (
        original.description !== current.description ||
        original.additionalInfo !== current.additionalInfo ||
        original.quantity !== current.quantity ||
        original.weight !== current.weight ||
        original.value !== current.value ||
        original.hscode !== current.hscode
      ) {
        return true;
      }
    }

    return false;
  };

  // Check if documents have changes
  const hasDocumentChanges = (originalDocs, currentDocs) => {
    const originalKeys = Object.keys(originalDocs);
    const currentKeys = Object.keys(currentDocs);

    // Different number of document types
    if (originalKeys.length !== currentKeys.length) {
      return true;
    }

    // Check each document type
    for (const cardId of originalKeys) {
      const originalDocsForCard = originalDocs[cardId] || [];
      const currentDocsForCard = currentDocs[cardId] || [];

      // Different number of documents for this card type
      if (originalDocsForCard.length !== currentDocsForCard.length) {
        return true;
      }

      // Check if document IDs match (documents were deleted/replaced)
      const originalIds = originalDocsForCard.map((doc) => doc.id).sort();
      const currentIds = currentDocsForCard.map((doc) => doc.id).sort();

      if (JSON.stringify(originalIds) !== JSON.stringify(currentIds)) {
        return true;
      }
    }

    return false;
  };

  // Check for new file uploads
  const hasNewFileUploads = () => {
    // Check for file preview wrappers marked as new files
    const newFileWrappers = document.querySelectorAll(
      '.file-preview-wrapper .remove-preview-btn[data-new-file="true"]'
    );
    return newFileWrappers.length > 0;
  };

  // Update submit button state
  const updateSubmitButtonState = (hasChanges) => {
    hasFormChanges = hasChanges;

    if (submitButton) {
      submitButton.disabled = !hasChanges;

      if (hasChanges) {
        submitButton.classList.remove("btn-disabled");
        submitButton.title = "";
      } else {
        submitButton.classList.add("btn-disabled");
        submitButton.title =
          "No changes detected. Make changes to enable resubmission.";
      }
    }

    console.log("Submit button state updated:", {
      hasChanges,
      disabled: !hasChanges,
    });
  };

  // Debounced change checker
  let changeCheckTimeout;
  const debouncedChangeCheck = () => {
    clearTimeout(changeCheckTimeout);
    changeCheckTimeout = setTimeout(() => {
      const hasChanges = checkForChanges();
      updateSubmitButtonState(hasChanges);
    }, 300);
  };

  // Set up change listeners
  const setupChangeListeners = () => {
    if (!submitShipmentForm) return;

    // Listen for input changes on form fields
    submitShipmentForm.addEventListener("input", debouncedChangeCheck);
    submitShipmentForm.addEventListener("change", debouncedChangeCheck);

    // Listen for file uploads/removals (these happen via document events in edit-shipment.js)
    document.addEventListener("fileUploaded", debouncedChangeCheck);
    document.addEventListener("fileRemoved", debouncedChangeCheck);
    document.addEventListener("cargoAdded", debouncedChangeCheck);
    document.addEventListener("cargoRemoved", debouncedChangeCheck);

    // Listen for cargo changes specifically
    const cargoContainer = document.getElementById("cargoContainer");
    if (cargoContainer) {
      const observer = new MutationObserver(debouncedChangeCheck);
      observer.observe(cargoContainer, {
        childList: true,
        subtree: true,
        attributes: false,
      });
    }

    // Listen for document area changes
    const documentTypes = document.querySelector(".document-types");
    if (documentTypes) {
      const observer = new MutationObserver(debouncedChangeCheck);
      observer.observe(documentTypes, {
        childList: true,
        subtree: true,
        attributes: false,
      });
    }
  };

  // ========================================
  // ========= MODAL FUNCTIONALITY ==========
  // ========================================

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

    if (!hasFormChanges) {
      showToast(
        "No changes detected. Please make changes before resubmitting.",
        true
      );
      hideConfirmationModal();
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

        // Recapture form state after successful submission
        setTimeout(() => {
          captureInitialFormState();
        }, 1000);

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

  // ========================================
  // ========= EVENT LISTENERS SETUP ========
  // ========================================

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

  // ========================================
  // ============ INITIALIZATION ============
  // ========================================

  // Initialize change tracking
  setTimeout(() => {
    captureInitialFormState();
    setupChangeListeners();
  }, 500); // Small delay to ensure all elements are loaded

  console.log(
    "Resubmit shipment JavaScript with change tracking loaded successfully"
  );
});
