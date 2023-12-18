import Principal "mo:base/Principal";
import TrieMap "mo:base/TrieMap";
import Types "./types";
import Array "mo:base/Array";
import Timer "mo:base/Timer";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";

actor class LikeFetch(
    userCanister: Principal
) = this {

    type UserActor = Types.UserActor;
    type PostImmutable = Types.PostImmutable;
    type Repost = Types.Repost;

    stable var notifyMapEntries: [(Principal, [Text])] = [];
    let notifyMap = TrieMap.fromEntries<Principal, [Text]>(notifyMapEntries.vals(), Principal.equal, Principal.hash);
    
    public shared({caller}) func receiveNotify(post: PostImmutable): async () {
        // 查到这个帖子的主用户的 followers
        let userActor: UserActor = actor(Principal.toText(userCanister));
        let postUserFollowers = await userActor.getFollowersList(post.user);

        // 通知粉丝
        _storeNotify(postUserFollowers, post.postId);

        // 通知转帖者
        _storeNotify(
            Array.map<Repost, Principal>(
                post.repost,
                func (x: Repost): Principal {
                    x.user
                }
            ), 
            post.postId
        );
    };

    public shared({caller}) func receiveRepostUserNotify(to: [Principal], postId: Text): async () {
        _storeNotify(to, postId);
    };

    public query func getNotifyMapEntries(): async [(Principal, [Text])] {
        Iter.toArray(notifyMap.entries())
    };

    private func _storeNotify(to: [Principal], postId: Text) {
        for(_follower in to.vals()) {
            switch(notifyMap.get(_follower)) {
                case(null) {
                    notifyMap.put(_follower, [postId]);
                };
                case(?_postIdArray) {
                    let _newPostIdArray = Array.append(_postIdArray, [postId]);
                    notifyMap.put(_follower, _newPostIdArray);
                };
            };
        };
    };
// userToFeed

    stable var userToFeedEntries: [(Principal, Principal)] = [];
    var userToFeed = TrieMap.fromEntries<Principal, Principal>(userToFeedEntries.vals(), Principal.equal, Principal.hash);

    public shared({caller}) func initUserToFeed(_userToFeedArray: [(Principal, Principal)]): async Bool {
        userToFeed := TrieMap.fromEntries(
            _userToFeedArray.vals(),
            Principal.equal,
            Principal.hash
        );
        true
    };

    public shared({caller}) func addUserToFeedEntry(entry: (Principal, Principal)): async Bool {
        switch(userToFeed.get(entry.0)) {
            case(?_feedCanister) { return false; };
            case(null) {
                userToFeed.put(entry.0, entry.1);
                true
            } 
        }
    };

    public query func getUserToFeedEntries(): async [(Principal, Principal)] {
        Iter.toArray(userToFeed.entries())
    };
    
    public query({caller}) func whoami(): async Principal { caller };

// Timer

    type FeedActor = Types.FeedActor;

    func notify(): async () {
        // Debug.print("likeFetch notify !");
        let _notifyMap = notifyMap; 
        for((_user, _postIdArray) in _notifyMap.entries()) {
            switch(userToFeed.get(_user)) {
                case(null) { };
                case(?_feedId) {
                    let feedActor: FeedActor = actor(Principal.toText(_feedId));
                    ignore feedActor.batchReceiveLike(_postIdArray);
                    notifyMap.delete(_user);
                };
            };
        };
    };

    let cycleTimer = Timer.recurringTimer(
        #seconds(2),
        notify
    );

    system func preupgrade() {
        notifyMapEntries := Iter.toArray(notifyMap.entries());
        userToFeedEntries := Iter.toArray(userToFeed.entries());
    };

    system func postupgrade() {
        notifyMapEntries := [];
        userToFeedEntries := [];
    };

};