// client/src/components/MultiImageUploader.jsx
import { useRef, useState } from 'react';
import '../styles/form.css';

export default function MultiImageUploader({ images, setImages, max = 9, prefix = 'items' }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    async function presign(filename, contentType) {
        const resp = await fetch('http://localhost:5002/api/uploads/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, contentType, prefix }),
        });
        if (!resp.ok) throw new Error('presign failed');
        return resp.json(); // { uploadUrl, fileUrl, key }
    }

    async function uploadOne(file) {
        const { uploadUrl, fileUrl } = await presign(file.name, file.type || 'application/octet-stream');
        const put = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
        });
        if (!put.ok) throw new Error('S3 upload failed');
        return fileUrl;
    }

    const onPick = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const remain = Math.max(0, max - images.length);
        const slice = files.slice(0, remain);

        setUploading(true);
        try {
            const urls = [];
            for (const f of slice) {
                const url = await uploadOne(f);
                urls.push(url);
            }
            setImages([...images, ...urls]);
        } catch (err) {
            console.error(err);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const removeAt = (idx) => {
        const next = images.slice();
        next.splice(idx, 1);
        setImages(next);
    };

    return (
        <div className="uploader">
            <div className="uploader-head">
                <div className="uploader-title">Images</div>
                <div className="uploader-sub">{uploading ? 'Uploading…' : `${images.length}/${max}`}</div>
            </div>

            <div className="uploader-grid">
                {images.map((src, i) => (
                    <div className="uploader-item" key={i}>
                        <img src={src} alt={`img-${i}`} />
                        <button type="button" className="uploader-del" onClick={() => removeAt(i)}>×</button>
                        {i === 0 && <span className="uploader-badge">Cover</span>}
                    </div>
                ))}

                {images.length < max && (
                    <label className="uploader-add">
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={onPick}
                            style={{ display: 'none' }}
                        />
                        <div className="uploader-add-icon">＋</div>
                        <div className="uploader-add-text">{uploading ? 'Uploading…' : 'Add Photos'}</div>
                    </label>
                )}
            </div>

            <div className="field-help">Up to {max} images. The first will be used as the cover.</div>
        </div>
    );
}