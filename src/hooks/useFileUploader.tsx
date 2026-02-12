'use client'
import { useState } from "react";
import { FileUploaderOptions } from "@subtrees/types";

const DEFAULT_FILE_SIZE_LIMIT = 1 * 1024 * 1024; // 1MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png'];



export const useFileUploader = (
    id: number | undefined,
    options: FileUploaderOptions = {}
) => {

    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);



    const {
        fileSizeLimit = DEFAULT_FILE_SIZE_LIMIT,
        allowedTypes = DEFAULT_ALLOWED_TYPES,
    } = options;


    const uploadHandler = async (data: FormData, file: File) => {
        /* Check Size */
        if (file && file.size > fileSizeLimit) {
            setError(`Size exceeds the limit of ${fileSizeLimit} bytes.`);

            return;
        }

        /* Check Type */
        if (file && !allowedTypes.includes(file.type)) {
            setError('Invalid file type.');
            return;
        }

        // Upload Progress
        // const res = await axios.post(path, data, {
        //     headers: {
        //         "Content-Type": "multipart/form-data",
        //         "Authorization": `Bearer `,
        //     },
        //     onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        //         const { loaded, total } = progressEvent;
        //         if (total) {
        //             const progress = Math.round((loaded * 100) / total)

        //             setProgress(progress);
        //         }

        //     }
        // });
        setIsSuccess(true)
        // return res.data
    };

    return { uploadHandler, isSuccess, progress };
};