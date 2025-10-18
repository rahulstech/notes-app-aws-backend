const BASE_URL = "https://43hbwedkn1.execute-api.ap-south-1.amazonaws.com/playground";

class ApiRequestForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.endpointPath = '';
        this.shadowRoot.innerHTML = `
            <style>
                form {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                    padding: 20px;
                    border-radius: 8px;
                    background-color: #f9f9f9;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                }
                input[type='text'], textarea, input[type='number'], input[type='file'] {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-sizing: border-box;
                }
                button {
                    padding: 10px 15px;
                    border: none;
                    background-color: #007bff;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    align-self: flex-start;
                }
                #create-note-section, #get-all-notes-section, #get-note-by-id-section, #delete-notes-section, #update-note-section, #add-media-section, #get-upload-urls-section, #upload-media-section, #remove-media-section {
                    display: none;
                    border-top: 1px solid #ddd;
                    margin-top: 20px;
                    padding-top: 20px;
                }
                .note-buttons {
                    display: flex;
                    gap: 10px;
                    margin-top: 10px;
                }
                .submit-button-wrapper {
                    margin-top: 20px;
                }
            </style>
            <form id="api-form">
                <div class="form-group">
                    <label for="api-url" id="api-url-label">API URL</label>
                    <input type="text" id="api-url" name="apiUrl" required>
                </div>
                <div class="form-group">
                    <label for="api-method">Method</label>
                    <input type="text" id="api-method" name="apiMethod" required readonly>
                </div>

                <div id="remove-media-section">
                    <h3>Remove Medias</h3>
                    <div class="form-group">
                        <label for="remove-media-note-id">Note ID</label>
                        <input type="text" id="remove-media-note-id" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="remove-media-media-ids">Media IDs</label>
                        <input type="text" id="remove-media-media-ids" class="form-control" placeholder="e.g., media45, media49">
                    </div>
                    <div class="note-buttons">
                        <button type="button" id="add-remove-media-to-request-btn">Add to Request</button>
                    </div>
                </div>

                <div id="upload-media-section">
                    <h3>Upload Media</h3>
                    <div class="form-group">
                        <label for="upload-media-file">Media File</label>
                        <input type="file" id="upload-media-file" class="form-control">
                    </div>
                </div>

                <div id="get-upload-urls-section">
                    <h3>Get Upload URLs</h3>
                    <div class="form-group">
                        <label for="get-upload-urls-note-id">Note ID</label>
                        <input type="text" id="get-upload-urls-note-id" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="get-upload-urls-media-ids">Media IDs</label>
                        <input type="text" id="get-upload-urls-media-ids" class="form-control" placeholder="e.g., media45, media49">
                    </div>
                    <div class="note-buttons">
                        <button type="button" id="add-upload-urls-to-request-btn">Add to Request</button>
                    </div>
                </div>

                <div id="add-media-section">
                    <h3>Add Media</h3>
                    <div class="form-group">
                        <label for="media-note-id">Note ID</label>
                        <input type="text" id="media-note-id" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="media-global-id">Global ID</label>
                        <input type="text" id="media-global-id" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="media-file">Media File (max 10MB, image/*)</label>
                        <input type="file" id="media-file" class="form-control" accept="image/*">
                    </div>
                    <div class="note-buttons">
                        <button type="button" id="add-media-to-request-btn">Add Media to Request</button>
                    </div>
                </div>

                <div id="update-note-section">
                    <h3>Update Note</h3>
                    <div class="form-group">
                        <label for="update-note-id">Note ID (required)</label>
                        <input type="text" id="update-note-id" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="update-note-title">Title (optional)</label>
                        <input type="text" id="update-note-title" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="update-note-content">Content (optional)</label>
                        <textarea id="update-note-content" rows="3" class="form-control"></textarea>
                    </div>
                    <div class="note-buttons">
                        <button type="button" id="add-update-note-btn">Add more</button>
                    </div>
                </div>

                <div id="delete-notes-section">
                    <h3>Delete Note(s)</h3>
                    <div class="form-group">
                        <label for="delete-note-id">Note ID</label>
                        <input type="text" id="delete-note-id" class="form-control">
                    </div>
                    <div class="note-buttons">
                        <button type="button" id="add-delete-note-id-btn">Add more</button>
                    </div>
                </div>

                <div id="get-note-by-id-section">
                    <h3>Path Parameter</h3>
                    <div class="form-group">
                        <label for="get-note-id">Note ID</label>
                        <input type="text" id="get-note-id" class="form-control">
                    </div>
                </div>

                <div id="get-all-notes-section">
                    <h3>Query Parameters</h3>
                    <div class="form-group">
                        <label for="get-limit">limit (optional)</label>
                        <input type="number" id="get-limit" class="form-control" min="1" placeholder="max 100">
                    </div>
                    <div class="form-group">
                        <label for="get-pageMark">pageMark (optional)</label>
                        <input type="text" id="get-pageMark" class="form-control">
                    </div>
                </div>

                <div id="create-note-section">
                    <h3>Add Note Details</h3>
                    <div class="form-group">
                        <label for="note-global-id">Global ID</label>
                        <input type="text" id="note-global-id" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="note-title">Title</label>
                        <input type="text" id="note-title" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="note-content">Content</label>
                        <textarea id="note-content" rows="3" class="form-control"></textarea>
                    </div>
                    <div class="note-buttons">
                        <button type="button" id="add-note-btn">More Note</button>
                    </div>
                </div>

                <div class="submit-button-wrapper">
                    <button type="submit">Send Request</button>
                </div>
            </form>
        `;
    }

    connectedCallback() {
        const apiForm = this.shadowRoot.querySelector('#api-form');
        const addNoteBtn = this.shadowRoot.querySelector('#add-note-btn');
        const globalIdInput = this.shadowRoot.querySelector('#note-global-id');
        const titleInput = this.shadowRoot.querySelector('#note-title');
        const contentInput = this.shadowRoot.querySelector('#note-content');
        const limitInput = this.shadowRoot.querySelector('#get-limit');
        const pageMarkInput = this.shadowRoot.querySelector('#get-pageMark');
        const noteIdInput = this.shadowRoot.querySelector('#get-note-id');
        const deleteNoteIdInput = this.shadowRoot.querySelector('#delete-note-id');
        const addDeleteNoteIdBtn = this.shadowRoot.querySelector('#add-delete-note-id-btn');
        const updateNoteIdInput = this.shadowRoot.querySelector('#update-note-id');
        const updateTitleInput = this.shadowRoot.querySelector('#update-note-title');
        const updateContentInput = this.shadowRoot.querySelector('#update-note-content');
        const addUpdateNoteBtn = this.shadowRoot.querySelector('#add-update-note-btn');
        const mediaNoteIdInput = this.shadowRoot.querySelector('#media-note-id');
        const mediaGlobalIdInput = this.shadowRoot.querySelector('#media-global-id');
        const mediaFileInput = this.shadowRoot.querySelector('#media-file');
        const addMediaToRequestBtn = this.shadowRoot.querySelector('#add-media-to-request-btn');
        const getUploadUrlsNoteIdInput = this.shadowRoot.querySelector('#get-upload-urls-note-id');
        const getUploadUrlsMediaIdsInput = this.shadowRoot.querySelector('#get-upload-urls-media-ids');
        const addUploadUrlsToRequestBtn = this.shadowRoot.querySelector('#add-upload-urls-to-request-btn');
        const uploadMediaFileInput = this.shadowRoot.querySelector('#upload-media-file');
        const removeMediaNoteIdInput = this.shadowRoot.querySelector('#remove-media-note-id');
        const removeMediaMediaIdsInput = this.shadowRoot.querySelector('#remove-media-media-ids');
        const addRemoveMediaToRequestBtn = this.shadowRoot.querySelector('#add-remove-media-to-request-btn');

        const getRequestBody = () => {
            const requestBodyEl = document.getElementById('request-body');
            try {
                return JSON.parse(requestBodyEl.textContent);
            } catch (e) {
                return {};
            }
        };

        const setRequestBody = (data) => {
            document.getElementById('request-body').textContent = JSON.stringify(data, null, 2);
        };

        addRemoveMediaToRequestBtn.addEventListener('click', () => {
            const noteId = removeMediaNoteIdInput.value.trim();
            const mediaIds = removeMediaMediaIdsInput.value.trim().split(',').map(id => id.trim());
            if (!noteId || mediaIds.length === 0) {
                alert('Please fill out both Note ID and Media IDs.');
                return;
            }

            const requestBody = getRequestBody();
            if (!requestBody.data) {
                requestBody.data = [];
            }

            let noteEntry = requestBody.data.find(d => d.note_id === noteId);
            if (noteEntry) {
                noteEntry.media_ids = [...new Set([...(noteEntry.media_ids || []), ...mediaIds])];
            } else {
                requestBody.data.push({ note_id: noteId, media_ids: mediaIds });
            }

            setRequestBody(requestBody);
            removeMediaNoteIdInput.value = '';
            removeMediaMediaIdsInput.value = '';
        });

        addUploadUrlsToRequestBtn.addEventListener('click', () => {
            const noteId = getUploadUrlsNoteIdInput.value.trim();
            const mediaIds = getUploadUrlsMediaIdsInput.value.trim().split(',').map(id => id.trim());
            if (!noteId || mediaIds.length === 0) {
                alert('Please fill out both Note ID and Media IDs.');
                return;
            }

            const requestBody = getRequestBody();
            if (!requestBody.data) {
                requestBody.data = [];
            }

            let noteEntry = requestBody.data.find(d => d.note_id === noteId);
            if (noteEntry) {
                noteEntry.media_ids = [...new Set([...(noteEntry.media_ids || []), ...mediaIds])];
            } else {
                requestBody.data.push({ note_id: noteId, media_ids: mediaIds });
            }

            setRequestBody(requestBody);
            getUploadUrlsNoteIdInput.value = '';
            getUploadUrlsMediaIdsInput.value = '';
        });

        addMediaToRequestBtn.addEventListener('click', () => {
            const noteId = mediaNoteIdInput.value.trim();
            const globalId = mediaGlobalIdInput.value.trim();
            const file = mediaFileInput.files[0];
            if (!noteId || !globalId || !file) {
                alert('Please fill out all media fields: Note ID, Global ID, and select a file.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert(`File for media ${globalId} is larger than 10MB.`);
                return;
            }

            const requestBody = getRequestBody();
            if (!requestBody.data) {
                requestBody.data = [];
            }

            let noteEntry = requestBody.data.find(d => d.note_id === noteId);
            if (noteEntry) {
                if (!noteEntry.medias) {
                    noteEntry.medias = [];
                }
                if (noteEntry.medias.length >= 5) {
                    alert('You can add a maximum of 5 medias per note.');
                    return;
                }
                noteEntry.medias.push({
                    global_id: globalId,
                    type: file.type,
                    size: file.size,
                });
            } else {
                requestBody.data.push({
                    note_id: noteId,
                    medias: [{
                        global_id: globalId,
                        type: file.type,
                        size: file.size,
                    }]
                });
            }

            setRequestBody(requestBody);
            mediaNoteIdInput.value = '';
            mediaGlobalIdInput.value = '';
            mediaFileInput.value = null;
        });

        limitInput.addEventListener('input', () => this.updateUrl());
        pageMarkInput.addEventListener('input', () => this.updateUrl());
        noteIdInput.addEventListener('input', () => this.updateUrl());

        addNoteBtn.addEventListener('click', () => {
            const globalId = globalIdInput.value.trim();
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();
            if (!globalId || !title || !content) {
                alert('Please fill out all note fields.');
                return;
            }

            const requestBody = getRequestBody();
            if (!requestBody.notes) {
                requestBody.notes = [];
            }

            const timestamp = Math.floor(Date.now() / 1000);
            requestBody.notes.push({
                global_id: globalId,
                title: title,
                content: content,
                timestamp_created: timestamp,
                timestamp_modified: timestamp
            });

            setRequestBody(requestBody);
            globalIdInput.value = '';
            titleInput.value = '';
            contentInput.value = '';
        });

        addDeleteNoteIdBtn.addEventListener('click', () => {
            const noteId = deleteNoteIdInput.value.trim();
            if (!noteId) {
                alert('Please enter a note ID.');
                return;
            }

            const requestBody = getRequestBody();
            if (!requestBody.note_ids) {
                requestBody.note_ids = [];
            }
            requestBody.note_ids.push(noteId);

            setRequestBody(requestBody);
            deleteNoteIdInput.value = '';
        });

        addUpdateNoteBtn.addEventListener('click', () => {
            const noteId = updateNoteIdInput.value.trim();
            const title = updateTitleInput.value.trim();
            const content = updateContentInput.value.trim();
            if (!noteId) {
                alert('Please enter a note ID.');
                return;
            }

            const requestBody = getRequestBody();
            if (!requestBody.notes) {
                requestBody.notes = [];
            }

            const timestamp = Math.floor(Date.now() / 1000);
            const note = { 
                note_id: noteId, 
                timestamp_modified: timestamp 
            };
            if (title) note.title = title;
            if (content) note.content = content;

            requestBody.notes.push(note);

            setRequestBody(requestBody);
            updateNoteIdInput.value = '';
            updateTitleInput.value = '';
            updateContentInput.value = '';
        });

        apiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const apiUrlInput = this.shadowRoot.querySelector('#api-url');
            let url = apiUrlInput.value;

            if (!url.startsWith('http')) {
                url = BASE_URL + url;
            }

            const apiMethod = this.shadowRoot.querySelector('#api-method').value;
            const responseContent = document.getElementById('response-content');
            const responseHeadersEl = document.getElementById('response-headers');
            const responseStatusEl = document.getElementById('response-status');
            const loader = document.getElementById('loader');

            loader.style.display = 'block';
            responseContent.textContent = '';
            responseHeadersEl.textContent = '';
            responseStatusEl.textContent = '';
            responseStatusEl.className = '';

            const requestBodyContent = document.getElementById('request-body').textContent;
            const uploadMediaFileInput = this.shadowRoot.querySelector('#upload-media-file');
            const isUploadMedia = this.shadowRoot.querySelector('#upload-media-section').style.display === 'block';

            let fetchOptions = {
                method: apiMethod,
                mode: 'cors',
                headers: {}
            };

            if (isUploadMedia && uploadMediaFileInput.files.length > 0) {
                const file = uploadMediaFileInput.files[0];
                fetchOptions.headers['Content-Type'] = file.type;
                fetchOptions.body = file;
            } else if (apiMethod !== 'GET' && requestBodyContent) {
                fetchOptions.headers['Content-Type'] = 'application/json';
                fetchOptions.body = requestBodyContent;
            }

            try {
                const response = await fetch(url, fetchOptions);
                const contentType = response.headers.get("content-type");
                const isJsonBody = contentType && contentType.includes("application/json");
                let data;
                if (isJsonBody) {
                    const body = await response.json();
                    data = JSON.stringify(body,null,2);
                }
                else {
                    await response.blob();
                    data = "";
                }

                responseContent.textContent = data;
                responseStatusEl.textContent = `Status: ${response.status}`;
                responseStatusEl.classList.add(response.ok ? 'success' : 'error');

                const headers = {};
                for (const [key, value] of response.headers.entries()) {
                    headers[key] = value;
                }
                const headerData = JSON.stringify(headers, null, 2);
                responseHeadersEl.textContent = headerData;
            } catch (error) {
                responseContent.textContent = `Error: ${error.message}`;
                responseStatusEl.textContent = `Status: Error`;
                responseStatusEl.classList.add('error');
            } finally {
                loader.style.display = 'none';
            }
        });
    }

    setEndpoint(path) {
        this.endpointPath = path;
        this.updateUrl();
    }

    updateUrl() {
        const apiUrlInput = this.shadowRoot.querySelector('#api-url');
        let url = this.endpointPath;

        const noteId = this.shadowRoot.querySelector('#get-note-id').value;
        if (noteId) {
            url += noteId;
        }

        const limit = this.shadowRoot.querySelector('#get-limit').value;
        const pageMark = this.shadowRoot.querySelector('#get-pageMark').value;
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit);
        if (pageMark) params.append('pageMark', pageMark);

        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
        
        apiUrlInput.value = url;
    }

    setFullUrlInput(isFullUrl) {
        const apiUrlInput = this.shadowRoot.querySelector('#api-url');
        const apiUrlLabel = this.shadowRoot.querySelector('#api-url-label');
        if (isFullUrl) {
            apiUrlLabel.textContent = 'Upload URL';
            this.endpointPath = ''; 
            apiUrlInput.value = '';
        } else {
            apiUrlLabel.textContent = 'API URL';
        }
    }

    toggleCreateNoteForm(show) {
        this.shadowRoot.querySelector('#create-note-section').style.display = show ? 'block' : 'none';
    }
    
    toggleAddMediaForm(show) {
        this.shadowRoot.querySelector('#add-media-section').style.display = show ? 'block' : 'none';
    }

    toggleGetUploadUrlsForm(show) {
        this.shadowRoot.querySelector('#get-upload-urls-section').style.display = show ? 'block' : 'none';
    }

    toggleUploadMediaForm(show) {
        this.shadowRoot.querySelector('#upload-media-section').style.display = show ? 'block' : 'none';
    }

    toggleRemoveMediaForm(show) {
        this.shadowRoot.querySelector('#remove-media-section').style.display = show ? 'block' : 'none';
    }

    toggleGetAllNotesForm(show) {
        this.shadowRoot.querySelector('#get-all-notes-section').style.display = show ? 'block' : 'none';
    }

    toggleGetNoteByIdForm(show) {
        this.shadowRoot.querySelector('#get-note-by-id-section').style.display = show ? 'block' : 'none';
    }

    toggleDeleteNotesForm(show) {
        this.shadowRoot.querySelector('#delete-notes-section').style.display = show ? 'block' : 'none';
    }

    toggleUpdateNoteForm(show) {
        this.shadowRoot.querySelector('#update-note-section').style.display = show ? 'block' : 'none';
    }

    toggleRequestBody(enabled) {
        const requestBody = document.getElementById('request-body');
        requestBody.setAttribute('contenteditable', enabled);
        requestBody.style.backgroundColor = enabled ? '' : '#f0f0f0';
    }

    clearData() {
        document.getElementById('request-body').textContent = '';
        document.getElementById('response-content').textContent = '';
        document.getElementById('response-headers').textContent = '';
        document.getElementById('response-status').textContent = '';
        document.getElementById('response-status').className = '';
        
        const fieldsToClear = [
            '#note-global-id', '#note-title', '#note-content', 
            '#get-limit', '#get-pageMark', '#get-note-id', 
            '#delete-note-id', '#update-note-id', '#update-note-title', 
            '#update-note-content', '#media-note-id', '#media-global-id', 
            '#media-file', '#get-upload-urls-note-id', '#get-upload-urls-media-ids', 
            '#upload-media-file', '#remove-media-note-id', '#remove-media-media-ids'
        ];

        fieldsToClear.forEach(selector => {
            const input = this.shadowRoot.querySelector(selector);
            if (input) {
                input.value = (input.type === 'file') ? null : '';
            }
        });
    }
}

customElements.define('api-request-form', ApiRequestForm);

document.addEventListener('DOMContentLoaded', () => {
    const aboutLink = document.querySelector('a[href="#about"]');
    const sections = document.querySelectorAll('.main-content section');
    const endpointLinks = document.querySelectorAll('.endpoint-list a');
    const allLinks = document.querySelectorAll('.sidebar a');
    const tabs = document.querySelectorAll('.tab-header');
    const apiRequestForm = document.querySelector('api-request-form');
    const endpointHeader = document.getElementById('endpoint-header');
    const endpointDescription = document.getElementById('endpoint-description');

    const setActiveLink = (activeLink) => {
        allLinks.forEach(link => link.classList.remove('active'));
        activeLink.classList.add('active');
    };

    const showSection = (id, headerText, descriptionText) => {
        sections.forEach(section => {
            section.style.display = section.id === id ? 'block' : 'none';
        });
        if (id === 'endpoints') {
            endpointHeader.textContent = headerText;
            endpointDescription.textContent = descriptionText;
        }
    };

    showSection('about', 'About');

    aboutLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('about', 'About');
        setActiveLink(aboutLink);
        apiRequestForm.clearData();
    });

    endpointLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            apiRequestForm.clearData();
            setActiveLink(link);

            const url = link.dataset.url;
            const method = link.dataset.method;
            const headerText = link.textContent;
            const description = link.dataset.description || '';

            showSection('endpoints', headerText, description);

            const apiUrlInput = apiRequestForm.shadowRoot.querySelector('#api-url');
            const apiMethodInput = apiRequestForm.shadowRoot.querySelector('#api-method');
            
            apiMethodInput.value = method;

            const isCreateNote = url === '/notes' && method === 'POST';
            const isGetAllNotes = url === '/notes' && method === 'GET';
            const isGetNoteById = url.startsWith('/notes/') && method === 'GET';
            const isDeleteNotes = url === '/notes' && method === 'DELETE';
            const isUpdateNote = url === '/notes' && method === 'PATCH';
            const isAddMedias = url === '/medias' && method === 'POST';
            const isGetUploadUrls = url === '/medias/uploadurl' && method === 'PUT';
            const isUploadMedia = url === '/medias/upload' && method === 'PUT';
            const isRemoveMedias = url === '/medias' && method === 'DELETE';

            apiRequestForm.toggleCreateNoteForm(isCreateNote);
            apiRequestForm.toggleGetAllNotesForm(isGetAllNotes && !isGetNoteById);
            apiRequestForm.toggleGetNoteByIdForm(isGetNoteById);
            apiRequestForm.toggleDeleteNotesForm(isDeleteNotes);
            apiRequestForm.toggleUpdateNoteForm(isUpdateNote);
            apiRequestForm.toggleAddMediaForm(isAddMedias);
            apiRequestForm.toggleGetUploadUrlsForm(isGetUploadUrls);
            apiRequestForm.toggleUploadMediaForm(isUploadMedia);
            apiRequestForm.toggleRemoveMediaForm(isRemoveMedias);

            apiRequestForm.setFullUrlInput(isUploadMedia);
            if (!isUploadMedia) {
                apiRequestForm.setEndpoint(url);
            }

            apiRequestForm.toggleRequestBody(!isGetAllNotes && !isGetNoteById && !isUploadMedia);
        });
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.tab-header.active').classList.remove('active');
            document.querySelector('.tab-pane.active').classList.remove('active');
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
    });
});
