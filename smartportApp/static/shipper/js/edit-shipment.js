// Complete Edit Shipment JavaScript - Merged functionality with Fixed Cargo Numbering
document.addEventListener("DOMContentLoaded", () => {
  // === SHARED TOAST FUNCTION ===
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

  // ========================================
  // === DOCUMENT DELETION FUNCTIONALITY ===
  // ========================================

  // Modal elements
  const deleteModal = document.getElementById("confirmDeleteDocsModal");
  const closeModalBtn = document.getElementById("closeDeleteDocsModal");
  const cancelBtn = document.getElementById("cancelRemoveUploadBtn");
  const confirmBtn = document.getElementById("confirmDeleteDocsBtn");
  const confirmBtnText = confirmBtn
    ? confirmBtn.querySelector(".btn-text")
    : null;
  const confirmBtnSpinner = confirmBtn
    ? confirmBtn.querySelector(".spinner")
    : null;

  let pendingDocumentId = null;
  let pendingDocumentElement = null;

  // Show modal function
  const showDeleteModal = (documentId, documentElement) => {
    pendingDocumentId = documentId;
    pendingDocumentElement = documentElement;
    if (deleteModal) {
      deleteModal.style.display = "flex";
    }
  };

  // Hide modal function
  const hideDeleteModal = () => {
    if (deleteModal) {
      deleteModal.style.display = "none";
    }
    pendingDocumentId = null;
    pendingDocumentElement = null;
    resetDocConfirmButton();
  };

  // Reset confirm button state
  const resetDocConfirmButton = () => {
    if (confirmBtn && confirmBtnText && confirmBtnSpinner) {
      confirmBtn.disabled = false;
      confirmBtnText.style.display = "inline";
      confirmBtnSpinner.style.display = "none";
    }
  };

  // Show loading state on confirm button
  const showDocLoadingState = () => {
    if (confirmBtn && confirmBtnText && confirmBtnSpinner) {
      confirmBtn.disabled = true;
      confirmBtnText.style.display = "none";
      confirmBtnSpinner.style.display = "inline-block";
    }
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

  // Modal close events for document deletion
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", hideDeleteModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", hideDeleteModal);
  }

  // Close modal when clicking outside
  if (deleteModal) {
    deleteModal.addEventListener("click", function (e) {
      if (e.target === deleteModal) {
        hideDeleteModal();
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      deleteModal &&
      deleteModal.style.display === "flex"
    ) {
      hideDeleteModal();
    }
  });

  // Confirm deletion
  if (confirmBtn) {
    confirmBtn.addEventListener("click", async function () {
      if (!pendingDocumentId || !pendingDocumentElement) return;

      showDocLoadingState();
      try {
        const response = await fetch(
          `/documents/delete/${pendingDocumentId}/`,
          {
            method: "POST",
            headers: {
              "X-CSRFToken": csrftoken,
              "Content-Type": "application/json",
            },
          }
        );

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
                  console.log(
                    "NOT an other card - keeping card for new uploads"
                  );
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
          showToast("Document deleted successfully", false);
          hideDeleteModal();
        } else {
          throw new Error(result.error || "Failed to delete document");
        }
      } catch (error) {
        console.error("Delete error:", error);
        showToast(error.message || "Error deleting document", true);
        resetDocConfirmButton();
      }
    });
  }

  // =====================================
  // === CARGO MANAGEMENT FUNCTIONALITY ===
  // =====================================

  const cargoContainer = document.getElementById("cargoContainer");
  const cargoTemplate = document.getElementById("cargoTemplate");

  // Modal elements for cargo deletion
  const deleteCargoModal = document.getElementById("confirmDeleteCargoModal");
  const closeCargoModalBtn = document.getElementById("closeDeleteCargoModal");
  const cancelCargoBtn = document.getElementById("cancelDeleteCargo");
  const confirmCargoBtn = document.getElementById("confirmDeleteCargoBtn");
  const confirmCargoBtnText = confirmCargoBtn
    ? confirmCargoBtn.querySelector(".btn-text")
    : null;
  const confirmCargoBtnSpinner = confirmCargoBtn
    ? confirmCargoBtn.querySelector(".spinner")
    : null;

  let cargoToDelete = null;

  // === FIXED CARGO NUMBERING SYSTEM ===
  // Track the highest existing cargo number on page load
  let highestCargoNumber = 0;

  // Helper function to mark cargo entries with database status
  const markCargoStatus = (cargoElement, isNew = true) => {
    if (isNew) {
      cargoElement.classList.add("cargo-new");
      // Don't set data-cargo-id for new entries
    } else {
      cargoElement.classList.add("cargo-existing");
      // Existing entries should already have data-cargo-id from backend
    }
  };

  // Initialize cargo numbering - find the highest existing number
  const initializeCargoNumbering = () => {
    document.querySelectorAll(".cargo-entry").forEach((entry) => {
      const numberElement = entry.querySelector(".cargo-number");
      if (numberElement) {
        const currentNumber = parseInt(numberElement.textContent) || 0;
        if (currentNumber > highestCargoNumber) {
          highestCargoNumber = currentNumber;
        }
      }
    });
    console.log("Highest existing cargo number:", highestCargoNumber);
  };

  // Modified renumber function - only renumber new/unmarked entries
  const renumberCargos = () => {
    const entries = document.querySelectorAll(".cargo-entry");
    let nextNumber = highestCargoNumber + 1;

    entries.forEach((entry) => {
      const numberElement = entry.querySelector(".cargo-number");
      if (numberElement) {
        // Only renumber if it's a new entry (no number, empty, or marked as "0")
        const currentNumber = parseInt(numberElement.textContent) || 0;
        if (currentNumber === 0 || numberElement.textContent.trim() === "") {
          numberElement.textContent = `${nextNumber}`;
          nextNumber++;
        }
      }
    });

    // Update the highest number tracker
    highestCargoNumber = Math.max(highestCargoNumber, nextNumber - 1);
    console.log("Updated highest cargo number to:", highestCargoNumber);
  };

  // For deletions - renumber all entries sequentially
  const renumberAfterDeletion = () => {
    document.querySelectorAll(".cargo-entry").forEach((entry, index) => {
      const number = entry.querySelector(".cargo-number");
      if (number) number.textContent = `${index + 1}`;
    });

    // Update the highest number tracker after renumbering
    const entries = document.querySelectorAll(".cargo-entry");
    highestCargoNumber = entries.length;
    console.log(
      "After deletion renumbering, highest cargo number:",
      highestCargoNumber
    );
  };

  // Update add buttons (only show on last entry)
  const updateAddButtons = () => {
    const cargoEntries = document.querySelectorAll(".cargo-entry");

    cargoEntries.forEach((entry, index) => {
      const btnContainer = entry.querySelector(".cargo-btn-container");
      const addBtn = entry.querySelector(".addCargoBtn");

      if (!btnContainer) return;

      // Only show the add button on the last entry
      if (addBtn) {
        if (index === cargoEntries.length - 1) {
          addBtn.style.display = "inline-block";
        } else {
          addBtn.style.display = "none";
        }
      }
    });
  };

  // Modal functions for cargo deletion
  const showCargoModal = () => {
    if (deleteCargoModal) {
      deleteCargoModal.style.display = "flex";
    }
  };

  const closeCargoModal = () => {
    if (deleteCargoModal) {
      deleteCargoModal.style.display = "none";
    }
    cargoToDelete = null;
    resetCargoConfirmButton();
  };

  // Reset cargo confirm button state
  const resetCargoConfirmButton = () => {
    if (confirmCargoBtn && confirmCargoBtnText && confirmCargoBtnSpinner) {
      confirmCargoBtn.disabled = false;
      confirmCargoBtnText.style.display = "inline";
      confirmCargoBtnSpinner.style.display = "none";
    }
  };

  // Show loading state on cargo confirm button
  const showCargoLoadingState = () => {
    if (confirmCargoBtn && confirmCargoBtnText && confirmCargoBtnSpinner) {
      confirmCargoBtn.disabled = true;
      confirmCargoBtnText.style.display = "none";
      confirmCargoBtnSpinner.style.display = "inline-block";
    }
  };

  // Delegated click handler for cargo buttons
  if (cargoContainer) {
    cargoContainer.addEventListener("click", (e) => {
      const target = e.target;

      // Add cargo button clicked
      if (target.classList.contains("addCargoBtn")) {
        console.log("Adding new cargo entry");

        if (cargoTemplate) {
          const clone = cargoTemplate.content.cloneNode(true);

          // Mark the new entry as unnumbered (so it gets the next available number)
          const numberElement = clone.querySelector(".cargo-number");
          if (numberElement) {
            numberElement.textContent = "0"; // Temporary marker for new entries
          }

          cargoContainer.appendChild(clone);
          renumberCargos(); // This will assign the correct next number
          updateAddButtons();
          showToast("New cargo entry added");
        } else {
          console.error("Cargo template not found");
          showToast("Error: Could not add cargo entry", true);
        }
      }

      // Remove cargo button clicked (using your &times; span)
      if (target.classList.contains("btn-remove-cargo")) {
        console.log("Remove cargo button clicked");

        const entry = target.closest(".cargo-entry");
        const total = document.querySelectorAll(".cargo-entry").length;

        if (entry && total > 1) {
          cargoToDelete = entry;
          showCargoModal();
        } else {
          showToast("At least one cargo entry is required", true);
        }
      }
    });
  }

  // Confirm cargo delete button
  if (confirmCargoBtn) {
    confirmCargoBtn.addEventListener("click", async () => {
      console.log("Confirming cargo deletion");

      if (cargoToDelete) {
        showCargoLoadingState();

        try {
          // Check if this cargo has an ID (exists in database)
          const cargoId =
            cargoToDelete.dataset.cargoId ||
            cargoToDelete.querySelector("[data-cargo-id]")?.dataset.cargoId;

          if (cargoId) {
            console.log("Deleting cargo from database, ID:", cargoId);

            // Make API call to delete from database
            const response = await fetch(`/cargo/delete/${cargoId}/`, {
              method: "DELETE", // or 'POST' depending on your backend
              headers: {
                "X-CSRFToken": csrftoken,
                "Content-Type": "application/json",
              },
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(
                result.error || "Failed to delete cargo from database"
              );
            }

            console.log("Cargo successfully deleted from database");
          } else {
            console.log("Cargo is new (not in database), skipping API call");
          }

          // Animate and remove from DOM
          setTimeout(() => {
            cargoToDelete.style.opacity = "0";
            cargoToDelete.style.transform = "scale(0.95)";
            cargoToDelete.style.transition = "all 0.3s ease";

            setTimeout(() => {
              cargoToDelete.remove();
              renumberAfterDeletion();
              updateAddButtons();
              showToast("Cargo entry deleted successfully");
              closeCargoModal();
            }, 300);
          }, 200);
        } catch (error) {
          console.error("Error deleting cargo:", error);
          showToast(error.message || "Error deleting cargo entry", true);
          resetCargoConfirmButton();
        }
      } else {
        closeCargoModal();
      }
    });
  }

  // Modal close/cancel events for cargo
  if (closeCargoModalBtn) {
    closeCargoModalBtn.addEventListener("click", closeCargoModal);
  }
  if (cancelCargoBtn) {
    cancelCargoBtn.addEventListener("click", closeCargoModal);
  }

  // Close cargo modal when clicking outside (on the overlay)
  if (deleteCargoModal) {
    deleteCargoModal.addEventListener("click", (e) => {
      if (e.target === deleteCargoModal) {
        closeCargoModal();
      }
    });
  }

  // Close cargo modal on Escape key (modified to avoid conflicts)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (deleteCargoModal && deleteCargoModal.style.display === "flex") {
        closeCargoModal();
      }
      // Note: Document deletion modal escape handler is above
    }
  });

  // ================================
  // === INITIALIZATION ===
  // ================================

  // Initialize cargo numbering and buttons on page load
  console.log("Initializing edit shipment functionality");

  // First, initialize the cargo numbering system
  initializeCargoNumbering(); // Find the highest existing number

  // Mark all existing cargo entries as existing (from database)
  document.querySelectorAll(".cargo-entry").forEach((entry) => {
    markCargoStatus(entry, false); // Mark as existing (from database)
  });

  renumberCargos(); // Handle any unnumbered entries (should be none on load)
  updateAddButtons(); // Show add buttons correctly

  console.log("Edit shipment JavaScript loaded successfully");

  // You can add more functionality here like:
  // - Form validation
  // - Document upload functionality
  // - Other edit shipment features

  // File upload handler for document cards
  const handleDocumentCardClick = (e) => {
    const card = e.target.closest(".document-type-card");
    if (!card) return;

    // Don't trigger upload if clicking on remove button or file preview
    if (
      e.target.closest(".remove-preview-btn") ||
      e.target.closest(".file-preview-wrapper")
    ) {
      return;
    }

    const cardId = card.id;
    let inputId = "";

    // Map card IDs to their corresponding file inputs
    const cardToInputMap = {
      bill_of_ladingCard: "billOfLadingInput",
      commercial_invoiceCard: "commercialInvoiceInput",
      packing_listCard: "packingListInput",
      certificate_originCard: "certificateOriginInput",
      othersCard: "othersInput",
    };

    // Handle dynamic "other_" cards (created for additional document types)
    if (cardId && cardId.startsWith("other_")) {
      inputId = "othersInput";
    } else {
      inputId = cardToInputMap[cardId];
    }

    if (!inputId) {
      console.error("No matching input found for card:", cardId);
      return;
    }

    const fileInput = document.getElementById(inputId);
    if (!fileInput) {
      console.error("File input not found:", inputId);
      return;
    }

    // Configure file input based on card type
    configureFileInput(fileInput, cardId);

    // Trigger file selection dialog
    fileInput.click();
  };

  // Configure file input properties
  const configureFileInput = (fileInput, cardId) => {
    // Set accepted file types
    const acceptedTypes = "image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx";
    fileInput.accept = acceptedTypes;

    // Allow multiple files for "others" card
    if (cardId === "othersCard" || cardId.startsWith("other_")) {
      fileInput.multiple = true;
    } else {
      fileInput.multiple = false;
    }
  };

  // Handle file selection
  const handleFileSelection = (e) => {
    const fileInput = e.target;
    const files = Array.from(fileInput.files);

    if (files.length === 0) return;

    // Find the corresponding card
    const inputId = fileInput.id;
    const cardId = getCardIdFromInput(inputId);

    console.log("File selection debug:", {
      inputId: inputId,
      expectedCardId: cardId,
      cardExists: !!document.getElementById(cardId),
    });

    const card = document.getElementById(cardId);

    if (!card) {
      console.error(
        "Card not found for input:",
        inputId,
        "Expected card ID:",
        cardId
      );
      // Try to find the card by examining all cards on the page
      const allCards = document.querySelectorAll(".document-type-card");
      console.log(
        "Available cards:",
        Array.from(allCards).map((c) => c.id)
      );
      return;
    }

    // Validate files
    const validFiles = validateFiles(files);
    if (validFiles.length === 0) {
      fileInput.value = ""; // Clear the input
      return;
    }

    // Update card appearance and preview
    updateCardWithFiles(card, validFiles);

    // Show success message
    const fileCount = validFiles.length;
    const message =
      fileCount === 1
        ? `File "${validFiles[0].name}" uploaded successfully`
        : `${fileCount} files uploaded successfully`;
    showToast(message, false);
  };

  // Map input IDs back to card IDs
  const getCardIdFromInput = (inputId) => {
    const inputToCardMap = {
      billOfLadingInput: "bill_of_ladingCard",
      commercialInvoiceInput: "commercial_invoiceCard",
      packingListInput: "packing_listCard",
      certificateOriginInput: "certificate_originCard",
      othersInput: "othersCard",
    };

    return inputToCardMap[inputId] || "othersCard";
  };

  // Validate selected files
  const validateFiles = (files) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    return files.filter((file) => {
      // Check file size
      if (file.size > maxSize) {
        showToast(
          `File "${file.name}" is too large. Maximum size is 10MB.`,
          true
        );
        return false;
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        showToast(`File "${file.name}" has an unsupported format.`, true);
        return false;
      }

      return true;
    });
  };

  // Update card with uploaded files
  const updateCardWithFiles = (card, files) => {
    const fileNameContainer = card.querySelector(".uploaded-file-name");
    const previewArea = card.querySelector(".file-preview-area");

    if (!previewArea) {
      console.error("Preview area not found in card");
      return;
    }

    previewArea.innerHTML = "";

    // Create preview for each file
    files.forEach((file) => {
      const previewWrapper = createFilePreview(file);
      previewArea.appendChild(previewWrapper);
    });

    // Mark card as having files
    card.classList.add("has-existing-file");
  };

  // Create file preview element
  const createFilePreview = (file) => {
    const wrapper = document.createElement("div");
    wrapper.className = "file-preview-wrapper";

    // Create file icon/preview based on type
    let fileElement = "";
    if (file.type.startsWith("image/")) {
      const imageUrl = URL.createObjectURL(file);
      fileElement = `<img src="${imageUrl}" class="file-preview-image" alt="Document preview">`;
    } else if (file.type === "application/pdf") {
      fileElement = '<i class="fas fa-file-pdf pdf-icon"></i>';
    } else if (file.type.includes("word")) {
      fileElement = '<i class="fas fa-file-word word-icon"></i>';
    } else if (file.type === "text/plain") {
      fileElement = '<i class="fas fa-file-alt txt-icon"></i>';
    } else if (file.type.includes("excel") || file.type.includes("sheet")) {
      fileElement = '<i class="fas fa-file-excel excel-icon"></i>';
    } else {
      fileElement = '<i class="fas fa-file file-icon"></i>';
    }

    wrapper.innerHTML = `
    ${fileElement}
    <span class="file-name-label">${file.name}</span>
    <button type="button" class="remove-preview-btn" title="Remove file" data-new-file="true">
      <i class="fas fa-times"></i>
    </button>
  `;

    return wrapper;
  };

  // Handle removal of newly uploaded files (not yet saved to database)
  const handleNewFileRemoval = (e) => {
    if (!e.target.closest(".remove-preview-btn")) return;

    const removeBtn = e.target.closest(".remove-preview-btn");
    const isNewFile = removeBtn.dataset.newFile === "true";

    if (isNewFile) {
      e.preventDefault();
      e.stopPropagation();

      const wrapper = removeBtn.closest(".file-preview-wrapper");
      const previewArea = wrapper.closest(".file-preview-area");
      const card = wrapper.closest(".document-type-card");

      // Animate removal
      wrapper.style.opacity = "0";
      wrapper.style.transform = "scale(0.8)";
      wrapper.style.transition = "all 0.3s ease";

      setTimeout(() => {
        wrapper.remove();

        // Update card state if no files remain
        if (previewArea.children.length === 0) {
          card.classList.remove("has-existing-file");
          const fileNameContainer = card.querySelector(".uploaded-file-name");
          if (fileNameContainer) {
            fileNameContainer.textContent = "";
          }

          // Clear the corresponding file input
          const inputId = getInputIdFromCard(card.id);
          const fileInput = document.getElementById(inputId);
          if (fileInput) {
            fileInput.value = "";
          }
        }

        showToast("File removed successfully", false);
      }, 300);
    }
  };

  // Helper function to get input ID from card ID
  const getInputIdFromCard = (cardId) => {
    const cardToInputMap = {
      bill_of_ladingCard: "billOfLadingInput",
      commercial_invoiceCard: "commercialInvoiceInput",
      packing_listCard: "packingListInput",
      certificate_originCard: "certificateOriginInput",
      othersCard: "othersInput",
    };

    if (cardId && cardId.startsWith("other_")) {
      return "othersInput";
    }

    return cardToInputMap[cardId] || "othersInput";
  };

  // =====================================
  // === EVENT LISTENERS SETUP ===
  // =====================================

  // Add click event listeners to all document cards
  document.addEventListener("click", handleDocumentCardClick);

  // Add click event listener for removing new files
  document.addEventListener("click", handleNewFileRemoval);

  // Add change event listeners to all file inputs
  document.addEventListener("change", (e) => {
    if (e.target.type === "file") {
      handleFileSelection(e);
    }
  });

  console.log("File upload functionality initialized");
});
