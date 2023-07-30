import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function App() {
    const [nickname, setNickname] = useState<string>("");
    const navigate = useNavigate();
    const onClick = () => {
        if (!nickname) {
            alert("닉네임을 입력하세요.");
            return;
        }
        navigate(`/room`, { state: { userNickname: nickname } });
    };
    return (
        <div className=" w-full h-screen flex justify-center space-x-2 items-center">
            <label>
                닉네임 :{" "}
                <input
                    className="border py-1"
                    type="text"
                    onChange={(e) => setNickname(e.currentTarget.value)}
                    value={nickname}
                />
            </label>
            <button
                className="border bg-blue-400 text-white rounded-md py-1 px-5"
                onClick={onClick}
            >
                입장
            </button>
        </div>
    );
}

export default App;
