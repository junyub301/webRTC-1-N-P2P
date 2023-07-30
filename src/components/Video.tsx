import { useEffect, useRef } from "react";

interface VideoProps {
    nickname: string;
    stream: MediaStream;
}

export default function Video({ nickname, stream }: VideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <article className=" flex-shrink basis-1/2">
            <div>
                {nickname}
                <video className="w-full h-full" ref={videoRef} autoPlay />
            </div>
        </article>
    );
}
