import { Socket, io } from "socket.io-client";
import Video from "../components/Video";
import { useEffect, useRef, useState } from "react";
import { BiShow, BiHide, BiMicrophoneOff, BiMicrophone, BiSolidPhone } from "react-icons/bi";
import { useLocation, useNavigate } from "react-router";

interface User {
    id: string;
    nickname: string;
    stream: MediaStream;
}
export default function Room() {
    const socket = useRef<Socket>();
    const myVideo = useRef<HTMLVideoElement>(null);
    const myStream = useRef<MediaStream>();
    const peerConnections = useRef<{ [socketId: string]: RTCPeerConnection }>({});
    const [users, setUsers] = useState<User[]>([]);
    const [micMuted, setMicMuted] = useState<boolean>(false);
    const [enabled, setEnabled] = useState<boolean>(false);
    const {
        state: { userNickname },
    } = useLocation() as { state: { userNickname: string } };
    const navigate = useNavigate();
    const getMedia = async (deviceId: any = null) => {
        try {
            const initialConstrains = { audio: true, video: { facingMode: "user" } };
            const cameraConstrains = {
                audio: true,
                video: {
                    deviceId: { exact: deviceId },
                },
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(
                deviceId ? cameraConstrains : initialConstrains
            );
            myStream.current = mediaStream;
            if (myVideo.current) {
                myVideo.current.srcObject = mediaStream;
            }
            if (!socket.current) return;
            socket.current.emit("join_room", {
                room: "12",
                nickname: userNickname,
            });
        } catch (e) {
            console.log(e);
        }
    };

    function createPeerConnection({ id, nickname }: { id: string; nickname: string }) {
        try {
            const pc = new RTCPeerConnection();
            pc.onicecandidate = (e) => {
                if (!(socket.current && e.candidate)) return;
                socket.current.emit("iceCandidate", {
                    candidate: e.candidate,
                    candidateSendId: socket.current.id,
                    candidateReceiveId: id,
                });
            };
            pc.ontrack = (e) => {
                setUsers((oldUsers) =>
                    oldUsers
                        .filter((user) => user.id !== id)
                        .concat({ id, nickname, stream: e.streams[0] })
                );
            };
            if (myStream.current) {
                myStream.current.getTracks().forEach((track) => {
                    if (!myStream.current) return;
                    pc.addTrack(track, myStream.current);
                });
            } else {
                console.log("my stream is undefined");
            }
            return pc;
        } catch (error) {
            return undefined;
        }
    }

    useEffect(() => {
        socket.current = io("http://localhost:8080");
        getMedia();

        socket.current.on("all_users", (allUsers: { id: string; nickname: string }[]) => {
            allUsers.forEach(async (user) => {
                if (!myStream.current) return;
                try {
                    const pc = createPeerConnection(user);
                    if (!(pc && socket.current)) return;
                    peerConnections.current = { ...peerConnections.current, [user.id]: pc };
                    try {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(new RTCSessionDescription(offer));
                        socket.current.emit("offer", {
                            offer,
                            offerSendId: socket.current.id,
                            offerSendNickname: userNickname,
                            offerReceiveId: user.id,
                        });
                    } catch (e) {}
                } catch (e) {}
            });
        });

        socket.current.on(
            "getOffer",
            async (data: {
                offer: RTCSessionDescription;
                offerSendId: string;
                offerSendNickname: string;
            }) => {
                const { offer, offerSendId, offerSendNickname } = data;
                if (!myStream.current) return;
                const pc = createPeerConnection({ id: offerSendId, nickname: offerSendNickname });
                if (!(pc && socket.current)) return;
                peerConnections.current = { ...peerConnections.current, [offerSendId]: pc };
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(new RTCSessionDescription(answer));
                    socket.current.emit("answer", {
                        answer,
                        answerSendId: socket.current.id,
                        answerReceiveId: offerSendId,
                    });
                } catch (error) {}
            }
        );

        socket.current.on(
            "getAnswer",
            async (data: { answer: RTCSessionDescription; answerSendId: string }) => {
                const { answer, answerSendId } = data;
                const pc = peerConnections.current[answerSendId];
                if (!pc) return;
                pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        );

        socket.current.on(
            "getIceCandidate",
            async (data: { candidate: RTCIceCandidate; candidateSendId: string }) => {
                const { candidate, candidateSendId } = data;
                const pc = peerConnections.current[candidateSendId];
                if (!pc) return;
                pc.addIceCandidate(candidate);
            }
        );
        socket.current.on("exit_user", (id: string) => {
            if (!peerConnections.current[id]) return;
            peerConnections.current[id].close();
            delete peerConnections.current[id];
            setUsers((oldUsers) => oldUsers.filter((user) => user.id !== id));
        });

        return () => {
            exitVideo();
        };
    }, []);

    const exitVideo = () => {
        if (socket.current) {
            socket.current.disconnect();
        }
        users.forEach((user) => {
            if (!peerConnections.current[user.id]) return;
            peerConnections.current[user.id].close();
            delete peerConnections.current[user.id];
        });
        navigate("/");
    };

    const onToggleMute = () => {
        myStream.current?.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
        setMicMuted((pre) => !pre);
    };
    const onToggleEnabled = () => {
        myStream.current?.getVideoTracks().forEach((video) => (video.enabled = !video.enabled));
        setEnabled((pre) => !pre);
    };

    return (
        <div className="App">
            <section className="flex  flex-wrap">
                <article className=" flex-shrink basis-1/2">
                    <div>
                        {userNickname}
                        <video className="w-full h-full" ref={myVideo} autoPlay muted={micMuted} />
                    </div>
                </article>
                {users.map((user) => (
                    <Video stream={user.stream} nickname={user.nickname} key={user.id} />
                ))}
            </section>
            <nav className="space-x-5 w-full fixed bottom-0 h-14">
                <div className="w-full h-14 fixed bg-slate-300 opacity-50"></div>
                <div className="space-x-5 w-full h-full relative flex justify-center items-center">
                    <button className="rounded-full h-10 w-10 p-2" onClick={onToggleMute}>
                        {micMuted ? (
                            <BiMicrophoneOff className="w-full h-full text-white" />
                        ) : (
                            <BiMicrophone className="w-full h-full text-white" />
                        )}
                    </button>
                    <button className="rounded-full h-10 w-10 p-2 bg-red-600" onClick={exitVideo}>
                        <BiSolidPhone className="w-full h-full text-white" />
                    </button>
                    <button className="rounded-full h-10 w-10 p-2 " onClick={onToggleEnabled}>
                        {enabled ? (
                            <BiHide className="w-full h-full text-white" />
                        ) : (
                            <BiShow className="w-full h-full text-white" />
                        )}
                    </button>
                </div>
            </nav>
        </div>
    );
}
